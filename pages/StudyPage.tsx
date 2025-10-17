import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { StudyMaterial, NoteLength, ChatMessage, PresentationContent, VideoScene, SlideContent } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import PptxGenJS from 'pptxgenjs';
import ErrorBoundary from '../components/common/ErrorBoundary';
import MermaidDiagram from '../components/common/MermaidDiagram';
import { AmeenaLogoIcon, UserIcon, BookOpenIcon, ChevronDownIcon, ClipboardListIcon, DownloadIcon, GlobeAltIcon, LightBulbIcon, PhotoIcon, PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon, PresentationChartIcon, Squares2X2Icon, SparklesIcon } from '../components/icons/Icons';

interface CollapsibleCardProps {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-card" data-open={isOpen}>
      <header className="collapsible-card-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="collapsible-card-title">
            <Icon style={{ width: 20, height: 20 }} />
            <h2>{title}</h2>
        </div>
        <ChevronDownIcon className="collapsible-card-chevron" style={{ width: 20, height: 20 }} />
      </header>
      {isOpen && (
        <div className="collapsible-card-content">
          {children}
        </div>
      )}
    </div>
  );
};


const VideoPlayer: React.FC<{ scenes: VideoScene[], selectedVoice: SpeechSynthesisVoice | null }> = ({ scenes, selectedVoice }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const currentScene = scenes[currentSceneIndex];
    
    useEffect(() => {
        return () => { 
            window.speechSynthesis.cancel(); 
            utteranceRef.current = null; 
        };
    }, []);

    const speakCurrent = useCallback(() => {
        if (!currentScene) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentScene.script);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = 1.0;
        utterance.onend = () => {
            setIsPlaying(false);
            setCurrentSceneIndex(i => {
                const next = i + 1;
                if (next < scenes.length) {
                    // auto-advance
                    setIsPlaying(true);
                    // defer speaking next scene to next tick
                    setTimeout(() => {
                        window.speechSynthesis.cancel();
                        const nextUtter = new SpeechSynthesisUtterance(scenes[next].script);
                        if (selectedVoice) nextUtter.voice = selectedVoice;
                        nextUtter.rate = 1.0;
                        nextUtter.onend = () => setIsPlaying(false);
                        utteranceRef.current = nextUtter;
                        window.speechSynthesis.speak(nextUtter);
                    }, 0);
                    return next;
                }
                return i; 
            });
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [currentScene, scenes, selectedVoice]);

    const handlePlayPause = () => {
        if (!currentScene) return;
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            speakCurrent();
        }
    };

    if (!currentScene) return <Alert type="warning" message="No scenes available to play." />;

    return (
        <div>
            <div className="video-player">
                {currentScene.imageUrl ? (
                    <img src={currentScene.imageUrl} alt={currentScene.imagePrompt} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <PhotoIcon style={{ width: 48, height: 48 }} />
                        <p>Visual not generated.</p>
                    </div>
                )}
                 <div className="video-player-script">
                   <p>{currentScene.script}</p>
                 </div>
            </div>
            <div className="presentation-controls">
                <Button variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setIsPlaying(false); setCurrentSceneIndex(i => Math.max(0, i-1)); }} disabled={currentSceneIndex === 0}><ChevronLeftIcon style={{ width: 24, height: 24 }} /></Button>
                <Button variant="ghost" onClick={handlePlayPause}>
                    {isPlaying ? <PauseIcon style={{ width: 32, height: 32 }} /> : <PlayIcon style={{ width: 32, height: 32 }} />}
                </Button>
                <Button variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setIsPlaying(false); setCurrentSceneIndex(i => Math.min(scenes.length - 1, i+1)); }} disabled={currentSceneIndex === scenes.length - 1}><ChevronRightIcon style={{ width: 24, height: 24 }} /></Button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Scene {currentSceneIndex + 1} of {scenes.length}</div>
        </div>
    );
};

const PresentationViewer: React.FC<{ presentation: PresentationContent }> = ({ presentation }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const currentSlide = presentation.slides[currentSlideIndex];
    
    if (!currentSlide) return <Alert type="info" message="No slides to display." />;

    return (
        <div className="presentation-viewer">
            <div className="presentation-slide">
                <div className="presentation-slide-content">
                     <h4>{currentSlide.title}</h4>
                     <ul>
                        {currentSlide.content.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>
                <div className="presentation-slide-image">
                    {currentSlide.imageUrl ? (
                       <img src={currentSlide.imageUrl} alt={currentSlide.imagePrompt} />
                    ) : (
                       <div style={{textAlign: 'center'}}>
                            <PhotoIcon style={{ width: 48, height: 48, margin: '0 auto' }} />
                            <p>No visual generated</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="presentation-controls">
                <Button variant="secondary" onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))} disabled={currentSlideIndex === 0}><ChevronLeftIcon/></Button>
                <span>Slide {currentSlideIndex + 1} of {presentation.slides.length}</span>
                <Button variant="secondary" onClick={() => setCurrentSlideIndex(i => Math.min(presentation.slides.length - 1, i + 1))} disabled={currentSlideIndex === presentation.slides.length - 1}><ChevronRightIcon/></Button>
            </div>
        </div>
    );
};


export const StudyPage: React.FC = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const navigate = useNavigate();
    const { getStudyMaterialById, updateStudyMaterial } = useUploadedContent();
    const [material, setMaterial] = useState<StudyMaterial | null>(null);

    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<Record<string, string | null>>({});

    const [chatInput, setChatInput] = useState('');
    const [isAwaitingChatResponse, setIsAwaitingChatResponse] = useState(false);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const [selectedNoteLength, setSelectedNoteLength] = useState<NoteLength>(NoteLength.MEDIUM);

    const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    
    const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
    const [presentationGenProgress, setPresentationGenProgress] = useState('');
    const [presentationError, setPresentationError] = useState<string | null>(null);

    const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
    const [diagramError, setDiagramError] = useState<string | null>(null);

    useEffect(() => {
        if (!contentId) { navigate('/'); return; }
        const foundMaterial = getStudyMaterialById(contentId);
        if (foundMaterial) { setMaterial(foundMaterial); } else { navigate('/'); }
    }, [contentId, getStudyMaterialById, navigate]);

    useEffect(() => {
      if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
    }, [material?.chatHistory, isAwaitingChatResponse]);

    useEffect(() => {
      if (!('speechSynthesis' in window)) return;
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter(v => v.lang.startsWith('en') && !v.name.includes('Google') && !v.name.includes('Microsoft'));
        setAvailableVoices(englishVoices);
        if(englishVoices.length > 0) { setSelectedVoice(englishVoices[0]); }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => { window.speechSynthesis.onvoiceschanged = null; }
    }, []);

    const handleGenerate = useCallback(async (type: 'summary' | 'explanation' | 'notes', generatorFn: () => Promise<any>) => {
        if (!material?.id) return;
        setIsLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));
        try {
            const result = await generatorFn();
            const updateKey = type === 'summary' ? 'aiSummary' : type === 'explanation' ? 'aiExplanation' : 'notes';
            const updateValue = type === 'notes' ? { ...material.notes, [selectedNoteLength]: result } : result;
            updateStudyMaterial(material.id, { [updateKey]: updateValue });
        } catch (e) {
            console.error(`Error generating ${type}:`, e);
            setError(prev => ({ ...prev, [type]: `Failed to generate ${type}. Please try again.` }));
        } finally {
            setIsLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [material?.id, material?.notes, selectedNoteLength, updateStudyMaterial]);


    const handleGenerateNotes = () => handleGenerate('notes', () => geminiService.generateNotes(material!.extractedText!, selectedNoteLength));

    const handleSendMessage = useCallback(async (textOverride?: string) => {
      const textToSend = (textOverride ?? chatInput).trim();
      if (!textToSend || !material?.id) return;
      
      const userMessage: ChatMessage = { id: `msg_${Date.now()}`, sender: 'user', text: textToSend, timestamp: new Date().toISOString() };
      updateStudyMaterial(material.id, { chatHistory: [...(material.chatHistory || []), userMessage] });
      setChatInput('');
      setIsAwaitingChatResponse(true);
      setError(prev => ({ ...prev, chat: null }));

      try {
        const systemInstruction = `You are Ameena AI, a friendly and expert study assistant. The user is currently studying the following material titled "${material.title}". Topic: ${material.topic}. Subject: ${material.subject}.\n\nRefer to this content when answering, but do not mention it explicitly unless asked. Be helpful, encouraging, and clear.\n\n---\nSTUDY MATERIAL:\n${material.extractedText?.substring(0, 4000)}...\n---`;
        const chat = geminiService.startOrGetChat(systemInstruction, material.chatHistory?.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] })));
        const { text: aiText, groundingSources } = await geminiService.sendMessageToChat(chat, userMessage.text, useGoogleSearch);
        const aiMessage: ChatMessage = { id: `msg_${Date.now() + 1}`, sender: 'ai', text: aiText, timestamp: new Date().toISOString(), groundingSources: groundingSources };
        updateStudyMaterial(material.id, { chatHistory: [...(material.chatHistory || []), userMessage, aiMessage] });
      } catch (e: any) {
        console.error("Error sending message:", e);
        const errorMessage: ChatMessage = { id: `err_${Date.now()}`, sender: 'ai', text: "Sorry, I encountered an error. Please check your connection or API key and try again.", timestamp: new Date().toISOString() };
        const currentMaterial = getStudyMaterialById(material.id);
        updateStudyMaterial(material.id, { chatHistory: [...(currentMaterial?.chatHistory || []), errorMessage] });
      } finally {
        setIsAwaitingChatResponse(false);
      }
    }, [chatInput, material, updateStudyMaterial, getStudyMaterialById, useGoogleSearch]);
    
    const handleGenerateFullPresentation = async () => {
        if (!material?.id || !material.aiExplanation) {
            setPresentationError("An explanation must be generated first to create a presentation."); return;
        }
        setIsGeneratingPresentation(true);
        setPresentationError(null);
        setPresentationGenProgress('Starting presentation generation...');
        try {
            setPresentationGenProgress('Step 1/2: Crafting slide content...');
            const content = await geminiService.generatePresentationContent(material.aiExplanation);
            if (!content) throw new Error("The AI failed to generate presentation content.");
            updateStudyMaterial(material.id, { presentationContent: content });
            const onProgress = (progress: string) => setPresentationGenProgress(`Step 2/2: ${progress}`);
            const contentWithImages = await geminiService.generatePresentationImages(content, onProgress);
            if (contentWithImages) {
                updateStudyMaterial(material.id, { presentationContent: contentWithImages });
                if (contentWithImages.slides.some(s => !s.imageUrl)) setPresentationError("Some slide visuals could not be generated.");
            } else { throw new Error("Failed to generate presentation images."); }
        } catch (err: any) {
            console.error("Presentation generation failed:", err);
            setPresentationError(err.message || "An unknown error occurred.");
            updateStudyMaterial(material.id, { presentationContent: undefined });
        } finally {
            setIsGeneratingPresentation(false);
            setPresentationGenProgress('');
        }
    };

    const handleDownloadPptx = () => {
      if (!material?.presentationContent) return;
      const { title, slides } = material.presentationContent;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      
      const titleSlide = pptx.addSlide();
      titleSlide.addText(title, { x: 0.5, y: 2.5, w: '90%', h: 1, fontSize: 44, bold: true, align: 'center' });
      titleSlide.addText(`By Ameena AI`, { x: 0.5, y: 3.5, w: '90%', h: 1, fontSize: 20, align: 'center' });

      slides.forEach(slide => {
        const pptxSlide = pptx.addSlide();
        if (slide.imageUrl) {
            pptxSlide.addImage({ data: slide.imageUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }
        pptxSlide.addText(slide.title, { x: 0.5, y: 0.25, w: '90%', h: 0.75, fontSize: 32, bold: true, color: "FFFFFF", outline: { size: 1, color: "000000" } });
        pptxSlide.addText(slide.content.join('\n'), { x: 0.5, y: 1.2, w: '50%', h: 4, fontSize: 18, bullet: true, color: "FFFFFF", outline: { size: 1, color: "000000" } });
      });
      const safeFilename = (material.title || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pptx.writeFile({ fileName: `${safeFilename}.pptx` });
    };
    
    const handleGenerateBlockDiagram = async () => {
        if (!material?.aiExplanation) { setDiagramError("Please generate an explanation first."); return; }
        setIsGeneratingDiagram(true);
        setDiagramError(null);
        try {
            const mermaidCode = await geminiService.generateBlockDiagram(material.aiExplanation);
            updateStudyMaterial(material!.id, { blockDiagramMermaid: mermaidCode || 'error' });
        } catch (err: any) {
            setDiagramError(err.message || 'Failed to generate diagram.');
            updateStudyMaterial(material!.id, { blockDiagramMermaid: 'error' });
        } finally {
            setIsGeneratingDiagram(false);
        }
    };
    
    const handleGenerateVideo = async () => {
        if (!material?.aiExplanation) { setError(prev => ({ ...prev, video: "Please generate an explanation first."})); return; }
        setIsLoading(prev => ({ ...prev, video: true }));
        setError(prev => ({ ...prev, video: null }));
        setVideoGenerationProgress('Starting video generation...');
        try {
            const scenes = await geminiService.generateVideoAssets(material.aiExplanation, (progress) => setVideoGenerationProgress(progress));
            updateStudyMaterial(material!.id, { videoScenes: scenes || [] });
        } catch (err: any) {
            console.error(err);
            setError(prev => ({ ...prev, video: err.message || "An unknown error occurred."}));
        } finally {
            setIsLoading(prev => ({ ...prev, video: false }));
            setVideoGenerationProgress('');
        }
    };


    if (!material) return <LoadingSpinner text="Loading study material..." />;
    
    const noteForSelectedLength = material.notes?.[selectedNoteLength];

    return (
        <div>
            <header className="study-page-header">
                <p className="meta-info">{material.subject} &gt; {material.topic}</p>
                <h1>{material.title}</h1>
                <div className="details">
                    <span>Difficulty: {material.difficulty}</span>
                    <span>Type: {material.type}</span>
                </div>
            </header>

            <div className="study-page-layout">
                <div>
                    <CollapsibleCard title="Original Content" icon={BookOpenIcon}>
                      <p style={{whiteSpace: 'pre-wrap'}}>{material.extractedText || "No text content available."}</p>
                    </CollapsibleCard>
                    
                    <CollapsibleCard title="AI-Powered Explanation" icon={LightBulbIcon} defaultOpen={true}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {error.explanation && <Alert type="error" message={error.explanation} />}
                            {material.aiExplanation ? (
                                <p style={{whiteSpace: 'pre-wrap'}}>{material.aiExplanation}</p>
                            ) : (
                                <p>No explanation generated yet. Click the button to get started!</p>
                            )}
                            <Button onClick={() => handleGenerate('explanation', () => geminiService.generateExplanation(material.extractedText!))} isLoading={isLoading.explanation} disabled={!material.extractedText || isLoading.explanation} leftIcon={<SparklesIcon />}>
                                {isLoading.explanation ? 'Generating...' : (material.aiExplanation ? 'Regenerate Explanation' : 'Generate Explanation')}
                            </Button>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="AI-Generated Notes" icon={ClipboardListIcon}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {error.notes && <Alert type="error" message={error.notes} />}
                          <div className="note-length-selector">
                              {(Object.keys(NoteLength) as Array<keyof typeof NoteLength>).map(key => (
                                <Button key={key} onClick={() => setSelectedNoteLength(NoteLength[key])} variant={selectedNoteLength === NoteLength[key] ? 'primary' : 'ghost'}>
                                  {key.charAt(0) + key.slice(1).toLowerCase()}
                                </Button>
                              ))}
                          </div>
                          
                          {noteForSelectedLength ? (
                            <p style={{whiteSpace: 'pre-wrap'}}>{noteForSelectedLength}</p>
                          ) : (
                            <p>Notes for this level of detail have not been generated yet.</p>
                          )}
                          <Button onClick={handleGenerateNotes} isLoading={isLoading.notes} disabled={!material.extractedText || isLoading.notes} leftIcon={<SparklesIcon />}>
                              {isLoading.notes ? 'Generating...' : (noteForSelectedLength ? `Regenerate ${selectedNoteLength} Notes` : `Generate ${selectedNoteLength} Notes`)}
                          </Button>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Generate Presentation" icon={PresentationChartIcon}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {presentationError && <Alert type="error" title="Presentation Error" message={presentationError} />}
                            {isGeneratingPresentation && <LoadingSpinner text={presentationGenProgress} />}

                            {!isGeneratingPresentation && material.presentationContent && (
                                <>
                                    <PresentationViewer presentation={material.presentationContent} />
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                                        <Button onClick={handleDownloadPptx} leftIcon={<DownloadIcon />}>Download .pptx</Button>
                                        <Button variant="secondary" onClick={handleGenerateFullPresentation} leftIcon={<SparklesIcon />}>Regenerate</Button>
                                    </div>
                                </>
                            )}

                            {!isGeneratingPresentation && !material.presentationContent && (
                                <div style={{ textAlign: 'center' }}>
                                    <p>Create a PowerPoint presentation from the AI-generated explanation.</p>
                                    <Button onClick={handleGenerateFullPresentation} isLoading={isGeneratingPresentation} disabled={!material.aiExplanation || isGeneratingPresentation} leftIcon={<SparklesIcon />}>
                                        {isGeneratingPresentation ? presentationGenProgress : 'Generate Presentation'}
                                    </Button>
                                    {!material.aiExplanation && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Please generate an explanation first.</p>}
                                </div>
                            )}
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Visualize as Block Diagram" icon={Squares2X2Icon}>
                        <ErrorBoundary>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                {diagramError && <Alert type="error" title="Diagram Error" message={diagramError} />}
                                {material.blockDiagramMermaid && material.blockDiagramMermaid !== 'error' && (
                                    <div style={{padding: '1rem', backgroundColor: 'white' }}><MermaidDiagram chart={material.blockDiagramMermaid} /></div>
                                )}
                                {material.blockDiagramMermaid === 'error' && !diagramError && (
                                    <Alert type="warning" title="Could not generate diagram" message="The AI was unable to create a valid diagram from the text." />
                                )}
                                <div>
                                    <Button onClick={handleGenerateBlockDiagram} isLoading={isGeneratingDiagram} disabled={!material.aiExplanation || isGeneratingDiagram} leftIcon={<SparklesIcon />}>
                                        {isGeneratingDiagram ? 'Generating...' : (material.blockDiagramMermaid ? 'Regenerate Diagram' : 'Generate Diagram')}
                                    </Button>
                                    {!material.aiExplanation && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Please generate an explanation first.</p>}
                                </div>
                            </div>
                        </ErrorBoundary>
                    </CollapsibleCard>

                    <CollapsibleCard title="Generate AI-Narrated Video" icon={PlayIcon}>
                        <ErrorBoundary>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                {error.video && <Alert type="error" title="Video Generation Error" message={error.video} />}
                                {isLoading.video && <LoadingSpinner text={videoGenerationProgress} />}

                                {!isLoading.video && material.videoScenes && material.videoScenes.length > 0 && (
                                    <div style={{width: '100%'}}>
                                        <VideoPlayer scenes={material.videoScenes} selectedVoice={selectedVoice}/>
                                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                            <label htmlFor="voice-select" className="form-label">Voice:</label>
                                            <select id="voice-select" className="form-select" value={selectedVoice?.name || ''} onChange={(e) => { const voice = availableVoices.find(v => v.name === e.target.value); if (voice) setSelectedVoice(voice); }} disabled={availableVoices.length === 0}>
                                                {availableVoices.length > 0 ? availableVoices.map(voice => (
                                                    <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>
                                                )) : <option>No voices</option>}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <Button onClick={handleGenerateVideo} isLoading={isLoading.video} disabled={!material.aiExplanation || isLoading.video} leftIcon={<SparklesIcon />}>
                                        {isLoading.video ? videoGenerationProgress : (material.videoScenes && material.videoScenes.length > 0 ? 'Regenerate Video' : 'Generate Video')}
                                    </Button>
                                    {!material.aiExplanation && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Please generate an explanation first.</p>}
                                </div>
                            </div>
                        </ErrorBoundary>
                    </CollapsibleCard>
                </div>

                <aside className="chat-container card">
                    <div className="chat-header">
                        <h2 style={{ textAlign: 'center' }}>Chat with Ameena</h2>
                    </div>
                    <div className="chat-messages" ref={chatContainerRef}>
                        {material.chatHistory && material.chatHistory.length > 0 ? material.chatHistory.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.sender}`}>
                            <div className="chat-message-avatar">
                                {msg.sender === 'user' ? <UserIcon /> : <AmeenaLogoIcon />}
                            </div>
                            <div className="chat-message-bubble">
                                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></div>
                                {msg.groundingSources && msg.groundingSources.length > 0 && (
                                    <div className="chat-message-sources">
                                        <strong>Sources:</strong>
                                        <ul>
                                            {msg.groundingSources.map(source => (
                                                <li key={source.uri}><a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        )) : (
                        <div style={{ textAlign: 'center', color: '#6c757d', margin: 'auto' }}>
                            <p>Ready to help!</p><p>Ask a question about your material.</p>
                        </div>
                        )}
                        {isAwaitingChatResponse && (
                          <div style={{alignSelf: 'flex-start'}}>
                            <div className="typing-indicator" aria-label="AI is typing">
                              <span></span><span></span><span></span>
                            </div>
                          </div>
                        )}
                    </div>
                    
                    <div className="chat-input-area">
                        {error.chat && <Alert type="error" message={error.chat} />}
                        <div className="chat-input-wrapper">
                            <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Ask a question..." rows={1} className="form-textarea" disabled={isAwaitingChatResponse} />
                            <Button variant="ghost" onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isAwaitingChatResponse}>Send</Button>
                        </div>
                        <label className="chat-google-toggle">
                            <input type="checkbox" checked={useGoogleSearch} onChange={(e) => setUseGoogleSearch(e.target.checked)} />
                            <GlobeAltIcon style={{ width: 16, height: 16 }}/> Search with Google for up-to-date info
                        </label>
                    </div>
                </aside>
            </div>
        </div>
    );
};