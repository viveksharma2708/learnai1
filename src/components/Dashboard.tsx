import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { QuizService, QuizData, AttemptData } from '../services/QuizService';
import { motion } from 'motion/react';
import { 
  Plus, 
  Play, 
  Clock, 
  BarChart3, 
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Target,
  Trophy,
  Youtube,
  FileVideo
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface DashboardProps {
  onQuizSelect: (id: string) => void;
  onCreateNew: () => void;
}

export default function Dashboard({ onQuizSelect, onCreateNew }: DashboardProps) {
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [qList, aList] = await Promise.all([
        QuizService.getQuizzes(),
        QuizService.getAttempts()
      ]);
      setQuizzes(qList);
      setAttempts(aList);
      setLoading(false);
    }
    loadData();
  }, []);

  const totalQuizzes = quizzes.length;
  const avgScore = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length)
    : 0;
  
  // Topic Analysis
  const allAnswers = attempts.flatMap(a => a.answers);
  const topicStats = allAnswers.reduce((acc, curr) => {
    if (!acc[curr.topic]) acc[curr.topic] = { correct: 0, total: 0 };
    acc[curr.topic].total += 1;
    if (curr.isCorrect) acc[curr.topic].correct += 1;
    return acc;
  }, {} as Record<string, { correct: number, total: number }>);

  const sortedTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
      fullMark: 100
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const strongTopics = sortedTopics.filter(t => t.accuracy >= 70).slice(0, 3);
  const weakTopics = sortedTopics.filter(t => t.accuracy < 70).slice(0, 3);

  // Chart Data Preparation
  const trendData = attempts
    .map((a, i) => ({
      name: `Session ${attempts.length - i}`,
      score: a.score,
      date: a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'
    }))
    .reverse();

  const quizPerformanceData = quizzes
    .map(q => {
      const quizAttempts = attempts.filter(a => a.quizId === q.id);
      const avgQuizScore = quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / quizAttempts.length)
        : 0;
      return {
        name: q.title.length > 15 ? q.title.substring(0, 15) + '...' : q.title,
        score: avgQuizScore,
        attempts: quizAttempts.length
      };
    })
    .filter(q => q.attempts > 0)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-48 bg-gray-200 rounded-lg mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-text">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Welcome back, {auth.currentUser?.displayName?.split(' ')[0]}</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-3 bg-brand-purple text-white rounded-xl font-black uppercase tracking-widest text-xs hover:translate-y-[-2px] transition-all active:scale-95 shadow-lg shadow-purple-500/20"
        >
          <Plus size={18} />
          New Session
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={TrendingUp} 
          label="Total Sessions" 
          value={totalQuizzes.toString()} 
          subtext="Analyzed"
        />
        <StatCard 
          icon={Target} 
          label="Average score" 
          value={`${avgScore}%`} 
          subtext="Success"
        />
        <StatCard 
          icon={Trophy} 
          label="Mastered Areas" 
          value={strongTopics.length.toString()} 
          subtext="Above 70%"
        />
      </div>

      {/* Performance Analytics Section */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <div className="p-8 bg-white rounded-xl border border-slate-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-text uppercase tracking-tight">Accuracy Trend</h2>
              <div className="px-3 py-1 bg-purple-50 text-brand-purple rounded-lg text-[10px] font-black tracking-widest uppercase">Over Time</div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 800, color: '#7C3AED' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#7C3AED" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#7C3AED', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-8 bg-white rounded-xl border border-slate-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-text uppercase tracking-tight">Topic Coverage</h2>
              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black tracking-widest uppercase">Knowledge Map</div>
            </div>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sortedTopics.slice(0, 6)}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Accuracy"
                    dataKey="accuracy"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      {quizPerformanceData.length > 1 && (
        <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Quiz Comparison</h2>
              <p className="text-slate-400 text-xs font-medium">Average performance across different session subjects</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                  {quizPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10B981' : entry.score >= 50 ? '#7C3AED' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Recent Quizzes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-text uppercase tracking-tight">Recent Sessions</h2>
            <button className="text-[10px] font-black text-brand-purple hover:underline uppercase tracking-widest">View All</button>
          </div>

          {quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-border text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Plus size={32} className="text-slate-300" />
              </div>
              <h3 className="font-black text-slate-text mb-1 uppercase tracking-tight">No sessions yet</h3>
              <p className="text-sm text-slate-500 font-medium max-w-xs mb-6 mx-auto">Analyze your first video to generate learning material.</p>
              <button 
                onClick={onCreateNew}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Create Session
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {quizzes.slice(0, 5).map((quiz) => (
                <motion.div 
                  key={quiz.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onQuizSelect(quiz.id!)}
                  className="group flex items-center justify-between p-5 bg-white rounded-xl border border-slate-border shadow-sm hover:border-brand-purple hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      quiz.status === 'ready' ? "bg-slate-50 text-slate-300 group-hover:bg-purple-50 group-hover:text-brand-purple" : "bg-slate-50 text-slate-400 group-hover:bg-brand-purple group-hover:text-white border border-slate-100"
                    )}>
                      {quiz.status === 'ready' ? <Play size={20} fill="currentColor" /> : <AlertCircle size={20} className="animate-pulse" />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-text group-hover:text-brand-purple transition-colors">{quiz.title}</h4>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          {quiz.videoType === 'youtube' ? <Youtube size={12} className="text-slate-300 group-hover:text-red-500" /> : <FileVideo size={12} />}
                          {quiz.videoType === 'youtube' ? 'YouTube' : 'Upload'}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span>{quiz.createdAt?.seconds ? formatDistanceToNow(quiz.createdAt.seconds * 1000) + ' ago' : 'Just now'}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 group-hover:text-brand-purple group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Topic Analysis Sidebar */}
        <div className="space-y-8">
          <div className="p-6 bg-white rounded-xl border border-slate-border shadow-sm space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-text">
              <BarChart3 size={18} className="text-slate-400" />
              Mastery Analysis
            </h2>

            {attempts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 font-medium">Complete quizzes to see topic insights.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-4">Strong Areas</h3>
                  <div className="space-y-4">
                    {strongTopics.map(t => (
                      <TopicMeter key={t.topic} topic={t.topic} val={t.accuracy} color="bg-green-500" />
                    ))}
                    {strongTopics.length === 0 && <p className="text-xs text-slate-400 italic">No mastered topics yet.</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4">Focus Needed</h3>
                  <div className="space-y-4">
                    {weakTopics.map(t => (
                      <TopicMeter key={t.topic} topic={t.topic} val={t.accuracy} color="bg-amber-500" />
                    ))}
                    {weakTopics.length === 0 && <p className="text-xs text-slate-400 italic">Looking good! No specific weak spots.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext }: { icon: any, label: string, value: string, subtext: string }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-slate-border shadow-sm">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100">
        <Icon size={20} className="text-brand-purple" />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-text">{value}</span>
          <span className="text-xs font-semibold text-slate-400">{subtext}</span>
        </div>
      </div>
    </div>
  );
}

function TopicMeter({ topic, val, color }: { topic: string, val: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-slate-600">
        <span className="truncate pr-2">{topic}</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] uppercase font-black",
          val >= 70 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        )}>{val}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${val}%` }}
          className={cn("h-full rounded-full transition-all", color)}
        />
      </div>
    </div>
  );
}

