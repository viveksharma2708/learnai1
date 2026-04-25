import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, 
  Search, 
  Play, 
  Calendar,
  Youtube,
  FileVideo,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface QuizListViewProps {
  onQuizSelect: (id: string) => void;
  onCreateNew: () => void;
  userId: string;
}

export default function QuizListView({ onQuizSelect, onCreateNew, userId }: QuizListViewProps) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'quizzes'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-text tracking-tight">Quizzes</h1>
          <p className="text-slate-400 font-medium mt-1">All generated quizzes from your video sessions</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-3 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-purple-hover transition-all shadow-lg shadow-purple-500/20 active:scale-95"
        >
          <Plus size={18} />
          New Session
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading sessions...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-border rounded-2xl p-16 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-text mb-2">No quizzes yet</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create your first video analysis session to generate AI-powered learning material.</p>
          <button 
            onClick={onCreateNew}
            className="px-8 py-4 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-purple-500/20"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {quizzes.map((quiz, i) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white rounded-2xl border border-slate-border shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all overflow-hidden flex flex-col"
            >
              <div className="p-8 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-text leading-tight group-hover:text-brand-purple transition-colors">
                      Quiz: {quiz.title}
                    </h3>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2 text-slate-400">
                        {quiz.videoType === 'youtube' ? <Youtube size={14} /> : <FileVideo size={14} />}
                        <span className="text-xs font-bold truncate max-w-[150px]">{quiz.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={14} />
                        <span className="text-xs font-bold">{quiz.createdAt ? format(quiz.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                    {quiz.questions?.length || 0}Q
                  </div>
                </div>

                <button 
                  onClick={() => onQuizSelect(quiz.id)}
                  className="w-full h-14 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group-hover:bg-brand-purple-hover transition-all shadow-lg shadow-purple-500/10"
                >
                  <BrainCircuit size={18} />
                  Take Quiz
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
