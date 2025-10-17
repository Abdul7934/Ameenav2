import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { QuizQuestion, AiGeneratedFeedback, Quiz } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { DEFAULT_QUIZ_DURATION_SECONDS, DEFAULT_QUIZ_QUESTIONS_count } from '../constants';
import { ArrowPathIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon } from '../components/icons/Icons';

const CircularProgress: React.FC<{ percentage: number }> = ({ percentage }) => {
  const sqSize = 150;
  const strokeWidth = 12;
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const dashArray = radius * Math.PI * 2;
  const dashOffset = dashArray - dashArray * percentage / 100;

  return (
    <div className="circular-progress">
      <svg width={sqSize} height={sqSize} viewBox={viewBox} className="circular-progress-svg">
        <circle
          className="circular-progress-background"
          cx={sqSize / 2} cy={sqSize / 2} r={radius} strokeWidth={`${strokeWidth}px`}
        />
        <circle
          className="circular-progress-bar"
          cx={sqSize / 2} cy={sqSize / 2} r={radius} strokeWidth={`${strokeWidth}px`}
          transform={`rotate(-90 ${sqSize / 2} ${sqSize / 2})`}
          style={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }}
        />
      </svg>
      <span className="circular-progress-text">{`${Math.round(percentage)}%`}</span>
    </div>
  );
};

const QuizPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { getStudyMaterialById, addQuizResult } = useUploadedContent();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUIZ_DURATION_SECONDS);
  const [quizState, setQuizState] = useState<'loading' | 'taking' | 'submitting' | 'results'>('loading');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<AiGeneratedFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const material = contentId ? getStudyMaterialById(contentId) : null;

  const loadQuestions = useCallback(async () => {
    if (!material?.extractedText) {
      setError("Content not found or empty. Cannot generate quiz."); setQuizState('results'); return;
    }
    setQuizState('loading'); setError(null);
    try {
      const generatedQuestions = await geminiService.generateQuizQuestions(material.extractedText, DEFAULT_QUIZ_QUESTIONS_count);
      if (generatedQuestions.length === 0) {
        setError("Could not generate quiz. Content might be too short or AI service unavailable."); setQuizState('results'); return;
      }
      setQuestions(generatedQuestions.map(q => ({...q, id: q.id || `q-${Math.random().toString(36).substr(2, 9)}` })));
      setQuizState('taking');
      setTimeLeft(DEFAULT_QUIZ_DURATION_SECONDS);
    } catch (e) {
      console.error("Error loading quiz questions:", e);
      setError("Failed to load quiz. Check connection or API key.");
      setQuizState('results');
    }
  }, [material?.extractedText]); 

  const handleSubmitQuiz = useCallback(async () => {
    if (quizState === 'submitting' || quizState === 'results') return;
    setQuizState('submitting');
    if (timerRef.current) clearTimeout(timerRef.current);

    let calculatedScore = 0;
    const answeredQuestions = questions.map(q => {
      const userAnswer = userAnswers[q.id];
      const userAnswerProcessed = userAnswer?.trim().toLowerCase();
      let isCorrect = false;
      if (typeof q.correctAnswer === 'string') isCorrect = userAnswerProcessed === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) calculatedScore++;
      return { ...q, userAnswer, isCorrect };
    });
    setQuestions(answeredQuestions);
    setScore(calculatedScore);

    if (contentId) {
      const quizResult: Quiz = { id: `quiz_${Date.now()}`, contentId, questions: answeredQuestions, score: calculatedScore, timestamp: new Date().toISOString(), durationSeconds: DEFAULT_QUIZ_DURATION_SECONDS - timeLeft };
      addQuizResult(contentId, quizResult);
    }
    
    try {
      const generatedFeedback = await geminiService.generateFeedbackOnQuiz(calculatedScore, questions.length, material?.extractedText);
      setFeedback(generatedFeedback);
    } catch (e) {
      console.error("Error generating feedback:", e);
      setFeedback({ text: "Could not generate AI feedback." });
    }
    
    setQuizState('results');
  }, [questions, userAnswers, timeLeft, contentId, addQuizResult, material?.extractedText, quizState]);
  
  useEffect(() => {
    if(!process.env.API_KEY) { setError("API Key not configured."); setQuizState('results'); return; }
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (quizState === 'taking' && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => setTimeLeft(prevTime => prevTime - 1), 1000);
    } else if (timeLeft === 0 && quizState === 'taking') { handleSubmitQuiz(); }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, quizState, handleSubmitQuiz]);

  const handleAnswerChange = (questionId: string, answer: string) => setUserAnswers(prev => ({ ...prev, [questionId]: answer }));

  const currentQ = questions[currentQuestionIndex];

  if (quizState === 'loading') return <LoadingSpinner text="Generating Your Quiz..." />;
  
  if (quizState === 'results') {
    const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
    return (
      <div className="quiz-results-container container">
        <h2>Quiz Complete!</h2>
        {error && <Alert type="error" message={error} />}
        
        <div className="card quiz-results-score-card">
           <CircularProgress percentage={percentage} />
           <p style={{ fontSize: '1.5rem', marginTop: '1rem', color: 'var(--color-text)' }}>You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>.</p>
        </div>

        {feedback && (
          <div className="card" style={{textAlign: 'left', marginBottom: '2rem'}}>
            <h3>AI Feedback</h3>
            <p>{feedback.text}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Review Your Answers:</h3>
            {questions.map((q, idx) => (
                <div key={q.id} className={`quiz-review-item ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                    <p><strong>Q{idx+1}: {q.questionText}</strong></p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {q.isCorrect ? <CheckCircleIcon style={{ width: 20, height: 20, color: 'var(--color-success)' }} /> : <XCircleIcon style={{ width: 20, height: 20, color: 'var(--color-error)' }} />}
                      <p>Your answer: <strong>{q.userAnswer || "Not answered"}</strong></p>
                    </div>
                    {!q.isCorrect && typeof q.correctAnswer === 'string' && <p>Correct answer: <strong>{q.correctAnswer}</strong></p>}
                </div>
            ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <Button variant="secondary" onClick={() => navigate(`/study/${contentId}`)} leftIcon={<BookOpenIcon />}>Back to Study</Button>
          <Button onClick={loadQuestions} leftIcon={<ArrowPathIcon />}>Try Again</Button>
        </div>
      </div>
    );
  }
  
  if (!currentQ && quizState === 'taking') return <Alert type="error" message="No questions available for this quiz." />;

  return (
    <div className="quiz-container">
      <div className="card">
          <header className="quiz-header">
             <div>
                <h2>{material?.title || 'Knowledge Check'}</h2>
                <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
             </div>
             <div className="quiz-timer">
                {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
             </div>
          </header>
          
          <div className="quiz-progress-bar">
            <div className="quiz-progress-bar-inner" style={{width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}}></div>
          </div>

          {currentQ && (
            <div key={currentQ.id}>
              <h3>{currentQ.questionText}</h3>
              {currentQ.type === 'mcq' && currentQ.options && (
                <div className="mcq-options">
                  {currentQ.options.map((option, idx) => (
                    <label key={idx} className={`mcq-option ${userAnswers[currentQ.id] === option ? 'selected' : ''}`}>
                        <input type="radio" name={`question-${currentQ.id}`} value={option} checked={userAnswers[currentQ.id] === option} onChange={() => handleAnswerChange(currentQ.id, option)} />
                        <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
              {currentQ.type === 'short_answer' && (
                <textarea className="form-textarea" value={userAnswers[currentQ.id] || ''} onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)} rows={4} placeholder="Type your answer here..." />
              )}
            </div>
          )}

          <footer className="quiz-footer">
            <Button variant="secondary" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>Previous</Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}>Next</Button>
            ) : (
              <Button onClick={handleSubmitQuiz} isLoading={quizState === 'submitting'}>{quizState === 'submitting' ? 'Submitting...' : 'Submit Quiz'}</Button>
            )}
          </footer>
      </div>
       {!process.env.API_KEY && <Alert type="warning" title="API Key Missing" message="The Gemini API key is not configured. Quiz features may not work correctly." />}
    </div>
  );
};

export default QuizPage;