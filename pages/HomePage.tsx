import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { UploadedContent } from '../types';
import Button from '../components/common/Button';
import * as geminiService from '../services/geminiService';
import Alert from '../components/common/Alert';
import { BrainIcon, LinkIcon, SparklesIcon, UploadIcon, DocumentTextIcon, PencilSquareIcon } from '../components/icons/Icons';

const HomePage: React.FC = () => {
  const [contentType, setContentType] = useState<'text' | 'youtube' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggestingMeta, setIsSuggestingMeta] = useState(false);

  const navigate = useNavigate();
  const { addContent } = useUploadedContent();

  const handleContentTypeChange = (newType: 'text' | 'youtube' | 'file') => {
    setContentType(newType);
    setError(null);
  };

  const handleSuggestMetadata = useCallback(async () => {
    let contentToAnalyze = '';
    if (contentType === 'text' && textContent.trim()) {
      contentToAnalyze = textContent;
    } else if (contentType === 'youtube' && youtubeUrl.trim()) {
      contentToAnalyze = `Analyze metadata for a youtube video with this URL: ${youtubeUrl}`;
    } else if (contentType === 'file' && selectedFile) {
      contentToAnalyze = `Analyze metadata for a file named: ${selectedFile.name}`;
    } else {
      setError(`Please provide content before suggesting metadata.`);
      return;
    }
    
    setIsSuggestingMeta(true);
    setError(null);
    try {
      const metadata = await geminiService.suggestMetadata(contentToAnalyze);
      setTitle(metadata.title);
      setSubject(metadata.subject);
      setTopic(metadata.topic);
      setDifficulty(metadata.difficulty);
    } catch (e) {
      console.error("Metadata suggestion failed", e);
      setError("Failed to suggest metadata. Please try again or fill manually.");
    } finally {
      setIsSuggestingMeta(false);
    }
  }, [textContent, contentType, youtubeUrl, selectedFile]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if ((contentType === 'text' && !textContent.trim()) ||
        (contentType === 'youtube' && !youtubeUrl.trim()) ||
        (contentType === 'file' && !selectedFile)) {
      setError(`Please provide the required content.`);
      setIsLoading(false);
      return;
    }

    const newContentId = `content_${Date.now()}`;
    let extractedText = textContent;
    let originalContentValue = textContent;
    let fileNameValue: string | undefined = undefined;
    let fileMimeTypeValue: string | undefined = undefined;

    try {
      if (contentType === 'youtube') {
        originalContentValue = youtubeUrl;
        extractedText = await geminiService.fetchYouTubeTranscript(youtubeUrl);
      } else if (contentType === 'file' && selectedFile) {
        originalContentValue = selectedFile.name;
        fileNameValue = selectedFile.name;
        fileMimeTypeValue = selectedFile.type;
        extractedText = await geminiService.processFileUploadSimulation(selectedFile);
      }

      // Auto-generate AI explanation immediately for faster experience
      const explanation = await geminiService.generateExplanation(extractedText);
      const finalTitle = title || (extractedText ? (await geminiService.suggestMetadata(extractedText)).title : 'Untitled');

      const uploadedContent: UploadedContent = {
        id: newContentId, type: contentType, originalContent: originalContentValue, fileName: fileNameValue,
        fileMimeType: fileMimeTypeValue, extractedText: extractedText, title: finalTitle, subject,
        topic, difficulty, uploadDate: new Date().toISOString(), aiExplanation: explanation,
      };

      addContent(uploadedContent);
      navigate(`/study/${newContentId}`);

    } catch (err) {
      console.error("Error processing content:", err);
      setError("Failed to process content. Please ensure your API key is configured and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => isLoading ? 'Processing...' : `Start Learning with AI`;

  const isSubmitDisabled = () => {
    if (isLoading || isSuggestingMeta) return true;
    if (contentType === 'text' && !textContent.trim()) return true;
    if (contentType === 'youtube' && !youtubeUrl.trim()) return true;
    if (contentType === 'file' && !selectedFile) return true;
    return false;
  }
  
  const contentTypes = [
    { id: 'text', name: 'Paste Text', icon: PencilSquareIcon },
    { id: 'youtube', name: 'YouTube Link', icon: LinkIcon },
    { id: 'file', name: 'Upload File', icon: DocumentTextIcon },
  ];

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      document.documentElement.style.setProperty('--parallax', `${Math.min(40, y * 0.2)}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <section className="home-hero">
        <h1>
          <BrainIcon className="icon-brain" /> Unlock Your Learning Potential
        </h1>
        <p>
          Provide your study material—text, YouTube videos, or files—and let Ameena AI create a personalized learning experience just for you.
        </p>
      </section>
      
      <div className="home-form-container">
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {error && <Alert type="error" message={error} />}
              
              <div>
                <h2>
                  1. Provide Your Content
                </h2>
                <div className="home-tabs">
                  {contentTypes.map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => handleContentTypeChange(tab.id as 'text' | 'youtube' | 'file')}
                      className={`home-tab ${contentType === tab.id ? 'active' : ''}`}
                    >
                      <tab.icon />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>

                <div>
                  {contentType === 'text' && (
                    <textarea id="textContent" className="form-textarea" value={textContent} onChange={(e) => { setTextContent(e.target.value); if(error) setError(null);}} rows={8} placeholder="Paste your study content here..." required={contentType === 'text'} />
                  )}
                  {contentType === 'youtube' && (
                    <div>
                       <input type="url" id="youtubeUrl" className="form-input" value={youtubeUrl} onChange={(e) => { setYoutubeUrl(e.target.value); if(error) setError(null);}} placeholder="https://www.youtube.com/watch?v=your_video_id" required={contentType === 'youtube'} />
                    </div>
                  )}
                  {contentType === 'file' && (
                    <div>
                       <label htmlFor="fileUpload" className="file-upload-label">
                          <div>
                              <UploadIcon style={{width: '40px', height: '40px', margin: '0 auto'}} />
                              <p style={{margin: '0.5rem 0 0.25rem'}}><span>Click to upload</span> or drag and drop</p>
                              <p style={{margin: 0, fontSize: '0.875rem'}}>PDF, PPT, DOC, TXT, or images</p>
                          </div>
                          <input type="file" id="fileUpload" style={{ display: 'none' }} onChange={(e) => { setSelectedFile(e.target.files ? e.target.files[0] : null); if(error) setError(null);}} accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png" required={contentType === 'file'} />
                      </label>
                      {selectedFile && <p style={{ marginTop: '1rem', textAlign: 'center' }}>Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>}
                    </div>
                  )}
                </div>
              </div>
            
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                   <h2>
                    2. Describe Your Content
                  </h2>
                   <Button type="button" variant="secondary" onClick={handleSuggestMetadata} isLoading={isSuggestingMeta} leftIcon={<SparklesIcon />} disabled={isLoading || isSuggestingMeta || ((contentType === 'text' && !textContent.trim()) || (contentType === 'youtube' && !youtubeUrl.trim()) || (contentType === 'file' && !selectedFile))}>
                    Suggest with AI
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{gridColumn: '1 / -1'}}>
                    <label htmlFor="title" className="form-label">Title</label>
                    <input type="text" id="title" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Introduction to Photosynthesis" />
                  </div>
                  <div>
                    <label htmlFor="subject" className="form-label">Subject</label>
                    <input type="text" id="subject" className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Biology" />
                  </div>
                  <div>
                    <label htmlFor="topic" className="form-label">Topic</label>
                    <input type="text" id="topic" className="form-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Plant Science" />
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                     <label htmlFor="difficulty" className="form-label">Difficulty</label>
                     <select id="difficulty" className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}>
                       <option value="Easy">Easy</option>
                       <option value="Medium">Medium</option>
                       <option value="Hard">Hard</option>
                     </select>
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Button type="submit" isLoading={isLoading} disabled={isSubmitDisabled()} leftIcon={<BrainIcon/>}>
                  {getButtonText()}
                </Button>
                 {!process.env.API_KEY && (
                   <Alert type="warning" title="API Key Missing" message="The Gemini API key is not configured. AI features will not work." style={{marginTop: '1.5rem'}} />
                )}
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomePage;