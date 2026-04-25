import { useState, useEffect } from 'react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  BookOpen, 
  ChevronRight,
  Loader2,
  BrainCircuit,
  History
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import QuizCreator from './components/QuizCreator';
import QuizViewer from './components/QuizViewer';
import Sidebar from './components/Sidebar';
import QuizListView from './components/QuizListView';
import { cn } from './lib/utils';

type View = 'landing' | 'dashboard' | 'sessions' | 'quizzes' | 'results' | 'create' | 'view';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u && currentView === 'landing') {
        setCurrentView('dashboard');
      } else if (!u) {
        setCurrentView('landing');
        setSelectedQuizId(null);
      }
    });
    return () => unsubscribe();
  }, [currentView]);

  const handleSignOut = () => {
    signOut(auth);
    setCurrentView('landing');
  };

  const navigateToQuiz = (id: string) => {
    setSelectedQuizId(id);
    setCurrentView('view');
  };

  const navigateToCreate = () => {
    setCurrentView('create');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-background text-slate-text font-sans antialiased">
      {/* Sidebar */}
      {user && (
        <Sidebar 
          user={user} 
          currentView={currentView} 
          onNavigate={(view) => setCurrentView(view)} 
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        user ? "pl-72 pr-12 py-10" : "flex flex-col"
      )}>
        <AnimatePresence mode="wait">
          {currentView === 'landing' && (
            <motion.section 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
            >
              <div className="w-20 h-20 bg-brand-purple rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3">
                <BrainCircuit className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-6 max-w-3xl leading-[0.95] text-slate-text">
                Learn deeper from every video.
              </h1>
              <p className="text-xl text-slate-500 max-w-xl mb-10 font-medium leading-relaxed">
                Transform any video into interactive quizzes, summaries, and personalized learning paths with AI.
              </p>
              <button 
                onClick={signInWithGoogle}
                className="group relative px-8 py-4 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest text-sm overflow-hidden transition-all hover:translate-y-[-2px] active:scale-95 shadow-lg shadow-purple-500/20"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Start Learning for Free
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.section>
          )}

          {user && currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <Dashboard onQuizSelect={navigateToQuiz} onCreateNew={navigateToCreate} />
            </motion.div>
          )}

          {user && currentView === 'quizzes' && (
            <motion.div
              key="quizzes"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <QuizListView 
                userId={user.uid} 
                onQuizSelect={navigateToQuiz} 
                onCreateNew={navigateToCreate} 
              />
            </motion.div>
          )}

          {user && currentView === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto"
            >
              <QuizCreator onCreated={navigateToQuiz} onCancel={() => setCurrentView('quizzes')} />
            </motion.div>
          )}

          {user && currentView === 'view' && selectedQuizId && (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QuizViewer quizId={selectedQuizId} onBack={() => setCurrentView('quizzes')} />
            </motion.div>
          )}
          
          {user && (currentView === 'sessions' || currentView === 'results') && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <LayoutDashboard size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-text">Coming Soon</h3>
                <p className="text-slate-500 font-medium">{currentView.charAt(0).toUpperCase() + currentView.slice(1)} view is being crafted.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
