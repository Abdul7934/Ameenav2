import { GoogleGenAI, GenerateContentResponse, Chat as GenAIChat, Content, Type, GenerateImagesResponse } from "@google/genai";
import { GEMINI_API_PRO_TEXT_MODEL, GEMINI_API_PRO_IMAGE_MODEL, DEFAULT_QUIZ_QUESTIONS_count } from '../constants';
import { QuizQuestion, NoteLength, AiGeneratedFeedback, PresentationContent, GroundingSource, VideoScene, SlideContent } from '../types';

// Re-export the Chat type so it can be used as geminiService.Chat
export type { GenAIChat as Chat };

const API_KEY = process.env.API_KEY;

// Safely initialize the AI client to prevent a crash if the API key is missing.
// This ensures the application can load and display a warning to the user.
let ai: GoogleGenAI | null;
try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } else {
    console.error("API_KEY for Gemini is not set. AI features will be disabled.");
    ai = null;
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. AI features will be disabled.", error);
  ai = null;
}

const MIN_CONTENT_LENGTH_FOR_GENERATION = 20; // Minimum characters needed to attempt generation
const MAX_CONTENT_LENGTH_FOR_GENERATION = 8000; // Max characters to send for faster processing

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T,>(
    fn: () => Promise<T>, 
    maxAttempts: number = 3, 
    initialDelay: number = 1000,
    onRetry?: (attempt: number, delay: number) => void
): Promise<T> => {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        } catch (err: any) {
            attempt++;
            const errorMessage = JSON.stringify(err);
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('UNAVAILABLE');

            if (isRateLimitError && attempt < maxAttempts) {
                if (onRetry) {
                    onRetry(attempt, delay);
                }
                console.warn(`Rate limit or transient error hit. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxAttempts})`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            } else {
                throw err;
            }
        }
    }
    // This part should not be reachable due to the throw in the loop
    throw new Error('Exceeded retry attempts.');
};


const parseJsonFromText = <T,>(text: string): T | null => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    
    // Fix for common JSON error where a comma is missing between objects
    jsonStr = jsonStr.replace(/}\s*{/g, '},{');

    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Original text:", text);
        return null;
    }
};

const parseMermaidFromText = (text: string): string | null => {
    let mermaidCode = text.trim();
    const fenceRegex = /^```(?:mermaid)?\s*\n(.*?)\n\s*```$/s;
    const match = mermaidCode.match(fenceRegex);

    if (match && match[1]) {
        mermaidCode = match[1].trim();
    }
    
    if (mermaidCode.startsWith('graph TD') || mermaidCode.startsWith('graph LR')) {
        return mermaidCode;
    }

    console.warn("Could not parse valid Mermaid syntax from response:", text);
    return null;
};

// --- Content Processing & Metadata ---

export const suggestMetadata = async (content: string): Promise<{ title: string; subject: string; topic: string; difficulty: 'Easy' | 'Medium' | 'Hard' }> => {
  const fallback = {
    title: `Content Analysis: ${content.substring(0, 30)}...`,
    subject: 'General',
    topic: 'Automated Analysis',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard'
  };

  if (!ai) {
    console.warn("API Key not configured. Using fallback metadata.");
    return fallback;
  }

  try {
    const prompt = `Analyze the following content and suggest metadata.
    - title: A concise, descriptive title.
    - subject: The main academic or professional subject (e.g., Biology, Computer Science, History).
    - topic: The specific topic within the subject (e.g., Photosynthesis, Data Structures, World War II).
    - difficulty: Choose one: 'Easy', 'Medium', or 'Hard'.

    Content: "${content.substring(0, 500)}..."`;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
          title: { type: Type.STRING },
          subject: { type: Type.STRING },
          topic: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
      },
      required: ["title", "subject", "topic", "difficulty"]
    };
    
    const response = await ai.models.generateContent({
      model: GEMINI_API_PRO_TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    
    const metadata = parseJsonFromText<any>(response.text);
    return metadata || fallback;
  } catch (error) {
    console.error("Metadata suggestion API call failed. Using fallback.", error);
    return fallback;
  }
};

export const fetchYouTubeTranscript = async (url: string): Promise<string> => {
    console.log("Simulating fetching transcript for:", url);
    if (!ai) return "API Key not configured. Cannot simulate transcript.";
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: `Imagine you are extracting the transcript from a YouTube video titled based on its URL: ${url}. The video is about a common educational topic related to technology or science. Please generate a plausible, medium-length (300-500 words) English transcript for such a video. The transcript should be formatted as plain text.`
    });
    return response.text;
};

export const processFileUploadSimulation = async (file: File): Promise<string> => {
    console.log("Simulating file processing for:", file.name);
    return `This is a simulated text extraction for the file "${file.name}". The content discusses key concepts related to the file's topic. For example, if it were a PDF about machine learning, it would cover topics like supervised learning, neural networks, and data preprocessing. This placeholder allows the AI to generate relevant study materials.`;
};


// --- AI Content Generation ---

export const generateSummary = async (content: string): Promise<string> => {
  if (!ai) return "API Key not configured. Summary unavailable.";
  if (content.length < MIN_CONTENT_LENGTH_FOR_GENERATION) return "Content is too short to generate a meaningful summary.";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_API_PRO_TEXT_MODEL,
      contents: `Generate a concise summary (around 100-150 words) of the following content. Focus on the main ideas and key takeaways.\n\nContent:\n${content.substring(0, MAX_CONTENT_LENGTH_FOR_GENERATION)}`,
      config: { temperature: 0.5, topP: 0.9, topK: 40 }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Failed to generate summary. Please try again.";
  }
};

export const generateExplanation = async (content: string): Promise<string> => {
  if (!ai) return "API Key not configured. Explanation unavailable.";
  if (content.length < MIN_CONTENT_LENGTH_FOR_GENERATION) return "Content is too short to generate a meaningful explanation.";
  
  const prompt = `You are an expert teacher. Your goal is to explain the core concepts from the following study material in a clear, simple, and easy-to-understand way.
Break down complex topics, use analogies if helpful, and structure the explanation logically. Avoid simply rephrasing the text; provide genuine clarification and insight.

Content to explain:
${content.substring(0, MAX_CONTENT_LENGTH_FOR_GENERATION)}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_API_PRO_TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.6, topP: 0.95, topK: 50 }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating explanation:", error);
    return "Failed to generate explanation. Please try again.";
  }
};

export const generateNotes = async (content: string, length: NoteLength): Promise<string> => {
    if (!ai) throw new Error("API Key not configured.");
    let promptDetail = '';
    switch(length) {
        case NoteLength.SHORT:
            promptDetail = 'Provide a concise summary in 3-5 bullet points. Focus only on the absolute main ideas.';
            break;
        case NoteLength.MEDIUM:
            promptDetail = 'Outline the core concepts and key supporting details in a structured list. Use nested bullets if necessary.';
            break;
        case NoteLength.DETAILED:
            promptDetail = 'Create comprehensive, detailed notes covering all significant topics, definitions, and examples. Structure it with clear headings and bullet points.';
            break;
    }
    const prompt = `Generate notes for the following content. The desired level of detail is: ${promptDetail}\n\nContent:\n${content.substring(0, MAX_CONTENT_LENGTH_FOR_GENERATION)}`;
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: prompt
    });
    return response.text;
};

export const generateQuizQuestions = async (content: string, count: number = DEFAULT_QUIZ_QUESTIONS_count): Promise<QuizQuestion[]> => {
    if (!ai) throw new Error("API Key not configured.");
    const prompt = `Generate a quiz with exactly ${count} questions based on the provided content. The quiz should include a mix of multiple-choice (MCQ) and short-answer questions. For MCQs, provide 4 distinct options.

Content:
${content.substring(0, MAX_CONTENT_LENGTH_FOR_GENERATION)}`;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['mcq', 'short_answer'] },
                questionText: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING }
            },
            required: ['id', 'type', 'questionText', 'correctAnswer']
        }
    };
    
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });

    const questions = parseJsonFromText<any[]>(response.text);
    return questions || [];
};

export const generateFeedbackOnQuiz = async (score: number, total: number, content?: string): Promise<AiGeneratedFeedback> => {
    if (!ai) return { text: "AI feedback is unavailable as the API key is not configured." };
    const prompt = `A student just completed a quiz on the following material. They scored ${score} out of ${total}. 
    Provide some brief, encouraging feedback. If their score is low, gently suggest which areas from the material they might want to review.
    
    Study Material (for context):
    ${content?.substring(0, 1000)}...`;
    
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: prompt
    });
    return { text: response.text };
};

export const generatePresentationContent = async (explanation: string): Promise<PresentationContent | null> => {
    if (!ai) throw new Error("API Key not configured.");
    const prompt = `Based on the following explanation, create content for a PowerPoint presentation.
    The presentation should have a main title and 5-7 content slides.
    For each slide, provide:
    1. A concise 'title'.
    2. 3-4 'content' bullet points.
    3. A visually descriptive 'imagePrompt' for an AI image generator. The prompt must describe a **professional and minimalist illustration** with a clean aesthetic. The image should be relevant to the slide's content, visually engaging, and suitable for a widescreen (16:9) presentation. **Do not include any text in the image description.**

    Explanation:
    ${explanation}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            slides: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.ARRAY, items: { type: Type.STRING } },
                        imagePrompt: { type: Type.STRING, description: 'A detailed prompt for an AI to generate a relevant image for this slide.' }
                    },
                    required: ['title', 'content', 'imagePrompt']
                }
            }
        },
        required: ['title', 'slides']
    };

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai!.models.generateContent({
            model: GEMINI_API_PRO_TEXT_MODEL,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        }), 4);
        return parseJsonFromText<PresentationContent>(response.text);
    } catch (error) {
        console.error("Failed to generate presentation content after retries:", error);
        return null;
    }
};


export const generateBlockDiagram = async (explanation: string): Promise<string | null> => {
    if (!ai) return null;
    const prompt = `You are an expert in creating flawless Mermaid.js diagrams. Your task is to create a "graph TD" (top-down) block diagram from the given text.

You MUST follow these rules STRICTLY:
1.  **SYNTAX:** Use only "graph TD" format.
2.  **CONCISENESS:** Keep node labels short and to the point. Do not use full sentences.
3.  **QUOTES ARE MANDATORY:** If a node's text contains ANY special characters (parentheses, commas, dashes, etc.) or spaces, you MUST enclose the entire text in double quotes.
    -   CORRECT: \`A["Node with (details)"] --> B["Another, one"]\`
    -   INCORRECT: \`A[Node with (details)] --> B[Another, one]\`
4.  **CONNECTIONS:** All connections must be complete using \`-->\`. Do not leave dangling arrows or use other arrow types.
5.  **NO SUBGRAPHS:** Do not use the \`subgraph\` keyword. Keep the diagram simple.
6.  **FINAL OUTPUT:** Enclose the final, complete Mermaid code in a single markdown code block like \`\`\`mermaid ... \`\`\`.

Explanation to visualize:
${explanation}`;
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: prompt,
    });
    return parseMermaidFromText(response.text);
};

export const generatePresentationImages = async (
  presentation: PresentationContent,
  onProgress: (progress: string) => void,
): Promise<PresentationContent | null> => {
    const getFallbackImageUrl = (prompt: string, seedSuffix: string) => {
        const encoded = encodeURIComponent(prompt);
        // Pollinations: free image-by-prompt service; seed helps vary images and avoid caching the same output
        const seed = encodeURIComponent(`presentation-${seedSuffix}`);
        return `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}`;
    };

    if (!ai) {
        // Fallback entirely to Pollinations if API is unavailable
        const updatedSlides = presentation.slides.map((slide, idx) => ({ ...slide, imageUrl: getFallbackImageUrl(slide.imagePrompt, `${idx}-${Date.now()}`) }));
        onProgress('Using fallback image provider.');
        return { ...presentation, slides: updatedSlides };
    }
    onProgress('Starting visual generation for slides...');
    
    const slides = presentation.slides;
    const updatedSlides: SlideContent[] = [];

    for (let i = 0; i < slides.length; i++) {
        if (i > 0) {
          await sleep(1000); // Add a delay to avoid hitting API rate limits.
        }
        const slide = slides[i];
        onProgress(`Creating visual for slide ${i + 1} of ${slides.length}...`);
        try {
            const imageResponse = await withRetry<GenerateImagesResponse>(() => 
                ai!.models.generateImages({
                    model: GEMINI_API_PRO_IMAGE_MODEL,
                    prompt: slide.imagePrompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
                }), 3, 1000,
                (attempt, delay) => { onProgress(`Rate limit on slide ${i + 1}. Retrying in ${delay / 1000}s...`); }
            );
            
            const image = imageResponse.generatedImages?.[0]?.image;
            const imageUrl = image?.imageBytes ? `data:${image.mimeType};base64,${image.imageBytes}` : getFallbackImageUrl(slide.imagePrompt, `${i}-${Math.random().toString(36).slice(2)}`);
            updatedSlides.push({ ...slide, imageUrl });
        } catch (error) {
            console.error(`Error generating image for slide: "${slide.title}"`, error);
            updatedSlides.push({ ...slide, imageUrl: getFallbackImageUrl(slide.imagePrompt, `${i}-${Math.random().toString(36).slice(2)}`) });
        }
        onProgress(`Visuals processing complete for ${i + 1}/${slides.length} slides.`);
    }

    onProgress('Visual generation complete!');
    return { ...presentation, slides: updatedSlides };
}

export const generateVideoAssets = async (
  explanation: string,
  onProgress: (progress: string) => void,
): Promise<VideoScene[] | null> => {
  const getFallbackImageUrl = (prompt: string, seedSuffix: string) => {
    const encoded = encodeURIComponent(prompt);
    const seed = encodeURIComponent(`video-${seedSuffix}`);
    return `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}`;
  };

  if (!ai) {
    onProgress('Using fallback image provider for scenes.');
    // We still need the script; without AI we cannot generate it. Return null.
    return null;
  }

  onProgress('Generating video script and image prompts...');

  const prompt = `You are an expert educator and creative director. Your task is to turn the following educational text into a script for a short, engaging video (around 1-2 minutes). Break it down into exactly 5 key scenes.

For each scene, provide:
1.  A concise "script" for the voice-over narration. Each script should be 2-3 sentences long.
2.  A detailed, visually rich "imagePrompt" for an AI image generator. The prompt must describe a **cinematic and photorealistic image** that is visually stunning. Describe the style (e.g., dramatic lighting, soft focus), composition, and content clearly. The image must be relevant to the script and suitable for a widescreen educational video. **Do not include any text in the image description.**

Educational Text:
${explanation}`;
  
  const scriptSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            script: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
        },
        required: ["script", "imagePrompt"]
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: GEMINI_API_PRO_TEXT_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: scriptSchema,
        }
    });

    const scenesData = parseJsonFromText<{ script: string; imagePrompt: string; }[]>(response.text);

    if (!scenesData || scenesData.length === 0) {
      console.error("Failed to parse video script from AI response", response.text);
      onProgress("Error: Could not generate video script.");
      return null;
    }

    const generatedScenes: VideoScene[] = [];
    for (let i = 0; i < scenesData.length; i++) {
      if (i > 0) {
        await sleep(1000); // Add a delay to avoid hitting API rate limits.
      }
      const sceneData = scenesData[i];
      onProgress(`Creating visual for scene ${i + 1} of ${scenesData.length}...`);

      try {
        const imageResponse = await withRetry<GenerateImagesResponse>(
          () => ai!.models.generateImages({
            model: GEMINI_API_PRO_IMAGE_MODEL,
            prompt: sceneData.imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
          }),
          3,
          1000,
          (attempt, delay) => {
            onProgress(`Rate limit hit on scene ${i + 1}. Retrying in ${delay / 1000}s...`);
          }
        );
        
        const image = imageResponse.generatedImages?.[0]?.image;
        if (image?.imageBytes) {
            const imageUrl = `data:${image.mimeType};base64,${image.imageBytes}`;
            generatedScenes.push({ ...sceneData, imageUrl });
        } else {
            console.warn(`No image data returned for scene: "${sceneData.script.substring(0, 30)}..."`);
            generatedScenes.push({ ...sceneData, imageUrl: getFallbackImageUrl(sceneData.imagePrompt, `${i}-${Math.random().toString(36).slice(2)}`) });
        }

      } catch (error) {
        console.error(`Error generating image for scene: "${sceneData.script.substring(0, 30)}..."`, error);
        generatedScenes.push({ ...sceneData, imageUrl: getFallbackImageUrl(sceneData.imagePrompt, `${i}-${Math.random().toString(36).slice(2)}`) });
      }
    }
    
    onProgress("Video generation complete!");
    return generatedScenes;

  } catch (error) {
    console.error("Failed to generate video assets:", error);
    onProgress("Error: A problem occurred during video generation.");
    return null;
  }
};


// --- Chat ---

export const startOrGetChat = (systemInstruction: string, history?: Content[]): GenAIChat => {
    if (!ai) throw new Error("API Key not configured.");
    return ai.chats.create({
        model: GEMINI_API_PRO_TEXT_MODEL,
        config: {
            systemInstruction: systemInstruction,
        },
        history: history || []
    });
};

export const sendMessageToChat = async (chat: GenAIChat, message: string, useGoogleSearch: boolean = false): Promise<{ text: string, groundingSources?: GroundingSource[] }> => {
    const config: any = {};
    if (useGoogleSearch) {
        config.tools = [{ googleSearch: {} }];
    }
    
    const response = await chat.sendMessage({
        message,
        config
    });

    let groundingSources: GroundingSource[] | undefined = undefined;
    if (useGoogleSearch) {
        const metadata = response.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
            groundingSources = metadata.groundingChunks
                .filter(chunk => chunk.web)
                .map(chunk => ({
                    uri: chunk.web!.uri,
                    title: chunk.web!.title,
                }));
        }
    }

    return { text: response.text, groundingSources };
};