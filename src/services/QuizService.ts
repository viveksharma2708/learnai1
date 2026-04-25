import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ai, MODEL_NAME } from '../lib/gemini';
import { Type } from '@google/genai';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface QuizData {
  id?: string;
  title: string;
  summary: string;
  topics: string[];
  transcript: string;
  videoUrl: string;
  videoType: 'youtube' | 'upload';
  ownerId: string;
  status: 'processing' | 'ready' | 'error';
  createdAt?: any;
}

export interface QuestionData {
  id?: string;
  quizId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
}

export interface AttemptData {
  id?: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    topic: string;
  }[];
  weakTopics: string[];
  strongTopics: string[];
  createdAt?: any;
}

export const QuizService = {
  async createQuiz(videoUrl: string, videoType: 'youtube' | 'upload', fileData?: string, mimeType?: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const quizId = `quiz_${Date.now()}`;
    const quizRef = doc(db, 'quizzes', quizId);

    const initialData: QuizData = {
      id: quizId,
      ownerId: userId,
      videoUrl,
      videoType,
      title: 'Processing Video...',
      summary: '',
      topics: [],
      transcript: '',
      status: 'processing',
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(quizRef, initialData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quizzes/${quizId}`);
    }

    // Now start AI Processing
    this.processVideoAI(quizId, videoUrl, videoType, fileData, mimeType);

    return quizId;
  },

  async processVideoAI(quizId: string, videoUrl: string, videoType: 'youtube' | 'upload', fileData?: string, mimeType?: string) {
    const quizRef = doc(db, 'quizzes', quizId);

    try {
      let prompt = "";
      let parts: any[] = [];

      if (videoType === 'upload' && fileData) {
        prompt = "Analyze this video/audio. Provide: 1. A catchy title. 2. A detailed structured summary. 3. List of key topics. 4. Complete transcript if possible. 5. Generate 5 multiple-choice questions with 4 options and 1 correct answer each. Map each question to one of the identified topics.";
        parts = [
          { inlineData: { data: fileData, mimeType: mimeType || 'video/mp4' } },
          { text: prompt }
        ];
      } else {
        // Extract YouTube Video ID to help the AI context
        const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "";
        const searchContext = videoId ? `(Video ID: ${videoId})` : "";

        prompt = `Analyze this YouTube video: ${videoUrl} ${searchContext}.
        
        CRITICAL: YOU MUST USE THE GOOGLE SEARCH TOOL to find the ACTUAL content, meta-information, and transcript details for THIS SPECIFIC video. 
        DO NOT hallucinate. You need to provide the real summary and real questions based on the video content, not just generic info from its title. 
        If possible, extract the transcript or key timestamps from the video description or search results.

        Please provide:
        1. The EXACT title of the video.
        2. A comprehensive, structured summary in Markdown (min 3-4 paragraphs) accurately reflecting the information in the video.
        3. A list of key topics covered with context from the video.
        4. A detailed transcript section or very accurate bulleted key points for the entire duration of the video.
        5. Generate 5 multiple-choice questions (MCQs) that explicitly test knowledge covered IN THE VIDEO. Each question must have 4 options (A, B, C, D), a correct answer, and the relevant topic.
        
        Return the result in JSON format with the following schema:
        {
          "title": "string",
          "summary": "markdown string",
          "topics": ["string"],
          "transcript": "string",
          "questions": [
            {
              "question": "string",
              "options": ["string", "string", "string", "string"],
              "correctAnswer": "string",
              "topic": "string"
            }
          ]
        }`;
        parts = [{ text: prompt }];
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        tools: videoType === 'youtube' ? [{ googleSearch: {} }] : [],
        config: {
          responseMimeType: "application/json",
        }
      });

      let resultText = response.text || "";
      if (!resultText) throw new Error("AI failed to generate response");
      
      // Handle cases where the model still wraps JSON in code blocks
      if (resultText.includes('```json')) {
        resultText = resultText.split('```json')[1].split('```')[0].trim();
      } else if (resultText.includes('```')) {
        resultText = resultText.split('```')[1].split('```')[0].trim();
      }
      
      const parsed = JSON.parse(resultText);

      // Update Quiz
      await setDoc(quizRef, {
        title: parsed.title,
        summary: parsed.summary,
        topics: parsed.topics,
        transcript: parsed.transcript || '',
        status: 'ready',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Create Questions
      for (const q of parsed.questions) {
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await setDoc(doc(db, `quizzes/${quizId}/questions`, questionId), {
          quizId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          topic: q.topic,
          id: questionId
        });
      }

    } catch (error) {
      console.error('AI Processing Error:', error);
      await setDoc(quizRef, { status: 'error' }, { merge: true });
    }
  },

  async getQuizzes() {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    try {
      const q = query(collection(db, 'quizzes'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizData));
    } catch (error) {
       handleFirestoreError(error, OperationType.LIST, 'quizzes');
       return [];
    }
  },

  async getQuiz(quizId: string) {
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
      if (!quizDoc.exists()) return null;
      return { id: quizDoc.id, ...quizDoc.data() } as QuizData;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
      return null;
    }
  },

  async getQuestions(quizId: string) {
    try {
      const snapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionData));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `quizzes/${quizId}/questions`);
      return [];
    }
  },

  async submitAttempt(attempt: Omit<AttemptData, 'id' | 'createdAt'>) {
    try {
      const attemptId = `attempt_${Date.now()}`;
      const attemptRef = doc(db, 'attempts', attemptId);
      await setDoc(attemptRef, {
        ...attempt,
        id: attemptId,
        createdAt: serverTimestamp(),
      });
      return attemptId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attempts');
      return null;
    }
  },

  async getAttempts() {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    try {
      const q = query(collection(db, 'attempts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttemptData));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attempts');
      return [];
    }
  }
};
