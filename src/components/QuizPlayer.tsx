import { useState } from 'react';
import { QuizService, QuizData, QuestionData, AttemptData } from '../services/QuizService';
import { auth } from '../lib/firebase';
import { 
  X, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  ArrowLeft,
  Target,
  BarChart,
  BrainCircuit,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface QuizPlayerProps {
  quiz: QuizData;
  questions: QuestionData[];
  onBack: () => void;
  onComplete: () => void;
}

export default function QuizPlayer({ quiz, questions, onBack, onComplete }: QuizPlayerProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AttemptData['answers']>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const question = questions[currentStep];

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === question.correctAnswer;
    const newAnswer = {
      questionId: question.id!,
      selectedOption,
      isCorrect,
      topic: question.topic
    };

    setAnswers(prev => [...prev, newAnswer]);
    setIsAnswered(true);

    // Short delay to show feedback
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        finishQuiz([...answers, newAnswer]);
      }
    }, 1500);
  };

  const finishQuiz = async (finalAnswers: AttemptData['answers']) => {
    setIsFinished(true);
    setSubmitting(true);

    const score = Math.round((finalAnswers.filter(a => a.isCorrect).length / questions.length) * 100);
    
    // Topic Analysis
    const topicAccuracy = finalAnswers.reduce((acc, curr) => {
      if (!acc[curr.topic]) acc[curr.topic] = { correct: 0, total: 0 };
      acc[curr.topic].total += 1;
      if (curr.isCorrect) acc[curr.topic].correct += 1;
      return acc;
    }, {} as Record<string, { correct: number, total: number }>);

    const strongTopics = Object.entries(topicAccuracy)
      .filter(([_, stats]) => (stats.correct / stats.total) >= 0.7)
      .map(([t]) => t);
    
    const weakTopics = Object.entries(topicAccuracy)
      .filter(([_, stats]) => (stats.correct / stats.total) < 0.7)
      .map(([t]) => t);

    await QuizService.submitAttempt({
      userId: auth.currentUser!.uid,
      quizId: quiz.id!,
      score,
      totalQuestions: questions.length,
      answers: finalAnswers,
      strongTopics,
      weakTopics
    });

    if (score >= 70) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#4F46E5', '#10B981']
      });
    }

    setSubmitting(false);
  };

  if (isFinished) {
    const score = Math.round((answers.filter(a => a.isCorrect).length / questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto py-12"
      >
        <div className="bg-white rounded-xl border border-slate-border shadow-2xl overflow-hidden relative">
          <div className="p-12 text-center space-y-8 relative z-10">
            <div className="relative inline-block">
              <div className="w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
                <span className="text-5xl font-black text-slate-text">{score}%</span>
              </div>
              <svg className="absolute top-0 left-0 w-40 h-40 -rotate-90">
                <circle 
                  cx="80" cy="80" r="72" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeDasharray={2 * Math.PI * 72}
                  strokeDashoffset={2 * Math.PI * 72 * (1 - score / 100)}
                  className="text-brand-purple"
                />
              </svg>
            </div>
            
            <div>
              <h2 className="text-4xl font-black tracking-tight text-slate-text">Session Complete!</h2>
              <p className="text-slate-500 font-medium mt-2">
                {score >= 80 ? "Outstanding mastery! You've grasped the core concepts." : "Good effort. Review the analysis to improve your score."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-4xl font-black text-slate-text">{answers.filter(a => a.isCorrect).length}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Correct Answers</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-4xl font-black text-slate-text">{answers.filter(a => !a.isCorrect).length}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Needs Review</div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={onComplete}
                className="w-full py-5 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest hover:translate-y-[-2px] transition-all shadow-lg shadow-purple-500/20"
              >
                Finish Session
              </button>
            </div>
          </div>
          
          <div className="bg-slate-50 p-8 border-t border-slate-border relative z-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Mastery Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(
                answers.reduce((acc, r) => {
                  acc[r.topic] = acc[r.topic] || { correct: 0, total: 0 };
                  acc[r.topic].total++;
                  if (r.isCorrect) acc[r.topic].correct++;
                  return acc;
                }, {} as Record<string, { correct: number, total: number }>)
              ).map(([topic, stats]) => {
                const mastery = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={topic} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{topic}</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        mastery >= 70 ? "text-green-600" : "text-amber-500"
                      )}>{mastery}% Mastery</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", mastery >= 70 ? "bg-green-500" : "bg-amber-500")}
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full -ml-24 -mb-24 opacity-50 pointer-events-none" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Quiz Header */}
      <header className="flex items-center justify-between px-2">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-text transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Quit Session
        </button>
        
        <div className="flex items-center gap-6 flex-1 justify-center">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Question {currentStep + 1} <span className="text-slate-200 mx-1">/</span> {questions.length}
          </div>
          <div className="h-1.5 w-48 bg-slate-200 rounded-full overflow-hidden shrink-0">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              className="h-full bg-brand-purple rounded-full"
            />
          </div>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Question Panel */}
        <div className="lg:col-span-8">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-8 md:p-10 border border-slate-border shadow-xl space-y-8"
          >
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-purple-50 text-brand-purple rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-100">
                Topic: {question.topic}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-text leading-tight tracking-tight">
                {question.question}
              </h2>
            </div>

            <div className="grid gap-4">
              {question.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = option === question.correctAnswer;
                const isSelected = selectedOption === option;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(option)}
                    disabled={isAnswered}
                    className={cn(
                      "group flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all",
                      isSelected && !isAnswered ? "border-brand-purple bg-purple-50/50 shadow-md" : 
                      isAnswered && isCorrect ? "border-green-500 bg-green-50 text-green-700" :
                      isAnswered && isSelected && !isCorrect ? "border-red-500 bg-red-50 text-red-700" :
                      "border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-all shadow-sm",
                        isSelected && !isAnswered ? "bg-brand-purple text-white" : "bg-white border border-slate-border text-slate-400 group-hover:text-brand-purple group-hover:border-brand-purple"
                      )}>
                        {letter}
                      </div>
                      <span className="font-bold text-lg">{option}</span>
                    </div>
                    {isAnswered && isCorrect && <CheckCircle2 size={20} />}
                    {isAnswered && isSelected && !isCorrect && <XCircle size={20} />}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!selectedOption || isAnswered}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors shadow-lg"
              >
                {isAnswered ? (currentStep === questions.length - 1 ? 'Finish Results' : 'Next Question') : 'Submit Answer'}
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Sidebar Assistance */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-8 bg-slate-900 text-white rounded-xl shadow-xl space-y-6 relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <BrainCircuit size={18} />
                </div>
                <h3 className="font-bold uppercase tracking-tight">AI Insights</h3>
              </div>
              <p className="text-sm font-medium text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4 py-1">
                "Think about the {question.topic.toLowerCase()} concepts mentioned in the video. This part often trips people up, but the key is in the definition."
              </p>
              <div className="pt-4 border-t border-slate-800">
                <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">
                  <MessageCircle size={14} />
                  Request Context Hint
                </button>
              </div>
            </div>
            
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full -mr-16 -mt-16 blur-2xl opacity-50" />
          </div>
          
          <div className="p-8 bg-white rounded-xl border border-slate-border shadow-sm space-y-6">
            <h3 className="font-black flex items-center gap-2 text-slate-700 uppercase tracking-tight">
              <Target className="text-slate-400" size={18} />
              Session Mastery
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {questions.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                    i < currentStep ? (answers[i]?.isCorrect ? "bg-green-100 text-green-700 border-2 border-green-200" : "bg-red-100 text-red-700 border-2 border-red-200") :
                    i === currentStep ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20 scale-110" : "bg-slate-50 text-slate-300 border border-slate-100"
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
