import { useState, useEffect } from 'react';
import { QuizService, QuizData, QuestionData } from '../services/QuizService';
import { 
  ChevronLeft, 
  Play, 
  FileText, 
  ListChecks, 
  Youtube, 
  Upload, 
  Loader2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import QuizPlayer from './QuizPlayer';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface QuizViewerProps {
  quizId: string;
  onBack: () => void;
}

export default function QuizViewer({ quizId, onBack }: QuizViewerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'quiz'>('overview');
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  useEffect(() => {
    // Listen for quiz changes (for "processing" state)
    const unsubscribe = onSnapshot(doc(db, 'quizzes', quizId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as QuizData;
        setQuiz(data);
        if (data.status === 'ready') {
          loadQuestions();
        }
      } else {
        setError('Quiz not found');
        setLoading(false);
      }
    });

    async function loadQuestions() {
      const qList = await QuizService.getQuestions(quizId);
      setQuestions(qList);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [quizId]);

  if (loading && !quiz) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin text-gray-300 mb-4" />
        <p className="text-gray-500">Loading analysis...</p>
      </div>
    );
  }

  if (quiz?.status === 'processing') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 p-12 bg-white rounded-xl border border-slate-border shadow-sm text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-25" />
          <div className="relative w-20 h-20 bg-brand-purple rounded-xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-3 text-slate-text">AI is processing your video</h2>
          <p className="text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
            We're extracting topics, generating a structured summary, and crafting relevant quiz questions. This will take a moment.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-3 h-3 bg-brand-purple rounded-full"
              />
            ))}
          </div>
          <button onClick={onBack} className="text-xs font-bold text-slate-400 hover:text-slate-text transition-colors uppercase tracking-widest">
            Cancel and Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (quiz?.status === 'error' || error) {
    return (
      <div className="max-w-md mx-auto p-12 bg-white rounded-xl border border-red-100 shadow-sm text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-4">Processing Failed</h2>
        <p className="text-slate-500 font-medium mb-8">{error || 'Something went wrong while analyzing the video.'}</p>
        <button onClick={onBack} className="w-full py-4 bg-slate-100 text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (view === 'quiz' && quiz) {
    return <QuizPlayer quiz={quiz} questions={questions} onBack={() => setView('overview')} onComplete={onBack} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Left Column: Details & Summary */}
      <div className="lg:col-span-8 space-y-10">
        <header className="space-y-6">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-text transition-colors uppercase tracking-widest"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              {quiz?.videoType === 'youtube' ? <Youtube size={14} className="text-red-500" /> : <Upload size={14} />}
              {quiz?.videoType === 'youtube' ? 'YouTube Analysis' : 'Upload Analysis'}
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>{quiz?.createdAt?.seconds ? formatDistanceToNow(quiz.createdAt.seconds * 1000) + ' ago' : 'Just now'}</span>
              <div className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full font-black">Ready</div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-slate-text">{quiz?.title}</h1>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex items-center gap-4 p-2 bg-white rounded-xl border border-slate-border shadow-sm sticky top-20 z-10">
          <button 
            onClick={() => setView('quiz')}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-brand-purple text-white rounded-lg font-black hover:translate-y-[-2px] transition-all shadow-lg shadow-purple-500/20"
          >
            <Play size={20} fill="currentColor" />
            START KNOWLEDGE QUIZ
          </button>
          <a 
            href={quiz?.videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            title="Watch Original Video"
          >
            <Youtube size={20} />
          </a>
        </div>

        {/* Summary Content */}
        <section className="bg-white rounded-xl p-8 md:p-10 border border-slate-border shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <FileText className="text-slate-400" size={20} />
            <h2 className="text-xl font-bold text-slate-text">AI Summary & Key Topics</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {quiz?.topics.map(topic => (
              <span 
                key={topic}
                className="px-3 py-1.5 bg-purple-50 text-brand-purple rounded-full text-[11px] font-bold uppercase tracking-wider"
              >
                {topic}
              </span>
            ))}
          </div>
          <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-h3:text-lg prose-h3:font-bold prose-h3:text-slate-text">
            <ReactMarkdown>{quiz?.summary || ''}</ReactMarkdown>
          </div>
        </section>

        {quiz?.transcript && (
          <section className="bg-white rounded-xl p-10 border border-slate-border shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Clock className="text-slate-400" size={20} />
                <h2 className="text-xl font-bold text-slate-text">Transcript Analysis</h2>
              </div>
              {quiz.transcript.length > 500 && (
                <button 
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                  className="text-xs font-black text-brand-purple uppercase tracking-widest hover:underline"
                >
                  {showFullTranscript ? 'Show Less' : 'Show Full Transcript'}
                </button>
              )}
            </div>
            <div className={cn(
              "text-slate-600 font-medium whitespace-pre-wrap leading-relaxed text-sm transition-all duration-300",
              !showFullTranscript && "max-h-60 overflow-hidden relative"
            )}>
              {quiz.transcript}
              {!showFullTranscript && quiz.transcript.length > 500 && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
          </section>
        )}
      </div>

      {/* Right Column: Topics & Stats */}
      <div className="lg:col-span-4 space-y-8">
        <aside className="p-8 bg-white rounded-xl border border-slate-border shadow-sm space-y-8 sticky top-24">
          <h3 className="font-bold flex items-center gap-2 text-slate-text">
            <ListChecks className="text-slate-400" size={20} />
            Analysis Metrics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-3xl font-black text-slate-text">{questions.length}</div>
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mt-1">Questions</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-3xl font-black text-slate-text">~5m</div>
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mt-1">Est. Time</div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50">
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <h4 className="text-xs font-bold text-purple-800 mb-2">Performance Goal</h4>
              <p className="text-[11px] text-purple-600 leading-relaxed font-semibold">
                Aim for 80% accuracy to master this segment. Your mastery metrics will update automatically.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
