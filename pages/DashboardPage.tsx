import React from 'react';
import { Link } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { StudyMaterial, Quiz } from '../types';
import Button from '../components/common/Button';
import { BarChartIcon, BookOpenIcon, ClipboardListIcon, SparklesIcon, UploadIcon } from '../components/icons/Icons';

const DashboardPage: React.FC = () => {
  const { studyMaterials, getQuizzesForContent } = useUploadedContent();

  const getTotalQuizzesTaken = () => studyMaterials.reduce((acc, material) => acc + (getQuizzesForContent(material.id)?.length || 0), 0);

  const getAverageQuizScore = () => {
    let totalScore = 0;
    let totalQuestions = 0;
    studyMaterials.forEach(material => {
      getQuizzesForContent(material.id)?.forEach(quiz => {
        if (typeof quiz.score === 'number' && quiz.questions.length > 0) {
          totalScore += quiz.score;
          totalQuestions += quiz.questions.length;
        }
      });
    });
    if (totalQuestions === 0) return 0;
    return parseFloat((totalScore / totalQuestions * 100).toFixed(1));
  };
  
  const recentActivities = [...studyMaterials].sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).slice(0, 5);

  if (studyMaterials.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state-icon">
            <BookOpenIcon style={{ width: 48, height: 48 }} />
        </div>
        <h2>Your Dashboard is Ready</h2>
        <p>Upload your first study material to begin your AI-powered learning journey.</p>
        <Link to="/">
            <Button leftIcon={<UploadIcon />}>Upload Content</Button>
        </Link>
      </div>
    );
  }
  
  const averageScore = getAverageQuizScore();
  const getSubText = (score: number) => {
      if (score === 0) return "No quizzes taken yet";
      if (score >= 85) return "Excellent work!";
      if (score >= 70) return "Good progress!";
      return "Keep reviewing!";
  };

  return (
    <div>
      <header style={{marginBottom: '2rem'}}>
        <h1>Dashboard</h1>
        <p>Welcome back! Here's a summary of your learning progress.</p>
      </header>

      <div className="dashboard-grid">
        <StatCard title="Materials Logged" value={studyMaterials.length.toString()} icon={BookOpenIcon} />
        <StatCard title="Quizzes Taken" value={getTotalQuizzesTaken().toString()} icon={ClipboardListIcon} />
        <StatCard title="Average Quiz Score" value={`${averageScore}%`} subText={getSubText(averageScore)} icon={BarChartIcon} />
      </div>

      <div className="dashboard-columns">
        <div>
          <h2>All Study Materials</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {studyMaterials.map(material => (
              <MaterialCard key={material.id} material={material} quizzes={getQuizzesForContent(material.id)} />
            ))}
          </div>
        </div>
        <div>
          <h2>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentActivities.map(material => <ActivityItem key={material.id} material={material} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subText?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, subText, icon: Icon }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <p>{title}</p>
      <div className="stat-card-icon">
        <Icon style={{ width: 24, height: 24 }} />
      </div>
    </div>
    <div>
        <p className="stat-card-value">{value}</p>
        {subText && <p className="stat-card-subtext">{subText}</p>}
    </div>
  </div>
);

const ActivityItem: React.FC<{ material: StudyMaterial }> = ({ material }) => (
  <div className="activity-item">
    <Link to={`/study/${material.id}`}>
        <h3>{material.title}</h3>
        <p style={{fontSize: '0.75rem', margin: 0}}>Uploaded on {new Date(material.uploadDate).toLocaleDateString()}</p>
    </Link>
  </div>
);

const MaterialCard: React.FC<{ material: StudyMaterial; quizzes: Quiz[] | undefined }> = ({ material, quizzes }) => {
  const quizzesTaken = quizzes?.length || 0;
  let lastQuizScore: string | null = null;
  if (quizzes && quizzesTaken > 0) {
      const lastQuiz = [...quizzes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (lastQuiz && typeof lastQuiz.score === 'number' && lastQuiz.questions.length > 0) {
        lastQuizScore = ((lastQuiz.score / lastQuiz.questions.length) * 100).toFixed(0);
      }
  }

  return (
    <div className="card material-card">
      <div className="material-card-header">
        <div>
          <p className="material-card-meta">{material.subject || 'General'}</p>
          <h3>{material.title}</h3>
          <div className="material-card-details">
             <span>Topic: <strong>{material.topic || 'N/A'}</strong></span>
             <span>Difficulty: <strong>{material.difficulty}</strong></span>
             <span>Quizzes: <strong>{quizzesTaken}</strong></span>
             {lastQuizScore !== null && <span>Last Score: <strong>{lastQuizScore}%</strong></span>}
          </div>
        </div>
        <Link to={`/study/${material.id}`}>
          <Button variant="secondary">Study Session</Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;