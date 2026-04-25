import { useState } from 'react';
import { QuizService } from '../services/QuizService';
import { 
  Youtube, 
  Upload, 
  X, 
  ArrowRight,
  Loader2,
  FileVideo,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface QuizCreatorProps {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

export default function QuizCreator({ onCreated, onCancel }: QuizCreatorProps) {
  const [mode, setMode] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let quizId = '';
      if (mode === 'youtube') {
        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
          throw new Error('Please enter a valid YouTube URL');
        }
        quizId = await QuizService.createQuiz(youtubeUrl, 'youtube');
      } else if (mode === 'upload' && file) {
        // Convert file to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data url prefix
          };
          reader.readAsDataURL(file);
        });
        
        const base64Data = await base64Promise;
        quizId = await QuizService.createQuiz(file.name, 'upload', base64Data, file.type);
      }

      onCreated(quizId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 20 * 1024 * 1024) { // 20MB limit for demo
        setError('File is too large. Max 20MB.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-border shadow-xl overflow-hidden">
      <div className="p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-text">New Study Session</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">AI will analyze the content and build a personalized quiz.</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-text transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        {/* Tab Selection */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button 
              onClick={() => setMode('youtube')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all",
                mode === 'youtube' ? "bg-white shadow-sm text-brand-purple" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Youtube size={18} />
              YouTube Link
            </button>
            <button 
              onClick={() => setMode('upload')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all",
                mode === 'upload' ? "bg-white shadow-sm text-brand-purple" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Upload size={18} />
              Video Upload
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {mode === 'youtube' ? (
              <motion.div 
                key="youtube"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Paste Link</label>
                  <div className="relative">
                    <input 
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmit(e as any);
                        }
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      required={mode === 'youtube'}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none transition-all placeholder:text-slate-300 font-medium"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                      <Youtube size={16} className="text-red-500" />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl flex gap-3 text-xs font-bold text-blue-700 border border-blue-100 uppercase tracking-wider">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p>AI will use search to find transcripts if direct access isn't available.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Video</label>
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all cursor-pointer",
                    file ? "border-green-400 bg-green-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  )}>
                    <input 
                      type="file" 
                      accept="video/*,audio/*" 
                      onChange={handleFileChange}
                      className="hidden"
                      required={mode === 'upload'}
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 size={32} className="text-green-500" />
                        <span className="font-bold text-green-700">{file.name}</span>
                        <span className="text-xs font-semibold text-green-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileVideo size={40} />
                        <span className="font-bold">Click or drag video file</span>
                        <span className="text-xs font-semibold uppercase tracking-wider">Max 20MB</span>
                      </div>
                    )}
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-50 rounded-xl flex gap-3 text-xs font-bold text-red-700 border border-red-100 uppercase tracking-wider">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button 
              disabled={loading || (mode === 'upload' && !file) || (mode === 'youtube' && !youtubeUrl)}
              className="w-full relative px-8 py-5 bg-brand-purple text-white rounded-xl font-black text-lg transition-all hover:translate-y-[-2px] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Content...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 uppercase tracking-widest">
                  Start AI Generation
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
              )}
              {loading && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-white/40"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 15, ease: "linear" }}
                />
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-slate-50 p-6 border-t border-slate-border">
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center text-white shrink-0 font-black">
            AI
          </div>
          <p>Processing typically completes within 30 seconds. Your analysis will be available in the library.</p>
        </div>
      </div>
    </div>
  );
}
