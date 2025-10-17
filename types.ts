

export interface UploadedContent {
  id: string;
  type: 'text' | 'youtube' | 'file'; // Added 'file'
  originalContent: string; // Pasted text, YouTube URL, or Original FileName for 'file' type
  fileName?: string; // Original name of the uploaded file
  fileMimeType?: string; // Mime type of the uploaded file
  extractedText?: string; // Text extracted, transcript, or simulated text from file
  title?: string;
  subject?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  uploadDate: string;
  aiExplanation?: string; // Add aiExplanation to base interface
}

export enum NoteLength {
  SHORT = '2M', // bullets
  MEDIUM = '5M', // core ideas
  DETAILED = '10M', // detailed
}
export interface AiGeneratedNotes {
  [NoteLength.SHORT]?: string;
  [NoteLength.MEDIUM]?: string;
  [NoteLength.DETAILED]?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short_answer';
  questionText: string;
  options?: string[]; // For MCQ
  correctAnswer: string | string[]; // string for SA, string for MCQ option, string[] for multiple correct MCQs (if ever needed)
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface Quiz {
  id:string;
  contentId: string;
  questions: QuizQuestion[];
  score?: number;
  timestamp: string;
  durationSeconds: number; // Duration of the quiz in seconds
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id:string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  groundingSources?: GroundingSource[];
}

export interface AiGeneratedFeedback {
  text: string;
}

export interface SlideContent {
  title: string;
  content: string[]; // Array of bullet points
  imagePrompt: string; // Prompt for generating a background/illustrative image
  imageUrl?: string; // Base64 URL of the generated image
}

export interface PresentationContent {
  title: string;
  slides: SlideContent[];
}

export interface VideoScene {
  script: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface StudyMaterial extends UploadedContent {
  notes?: AiGeneratedNotes;
  aiSummary?: string; 
  aiExplanation?: string;
  chatHistory?: ChatMessage[];
  presentationContent?: PresentationContent;
  blockDiagramMermaid?: string;
  videoScenes?: VideoScene[];
}

// For Gemini API related types, we will use those from "@google/genai" directly in service.
// However, we might define specific request/response structures for our app's use cases.