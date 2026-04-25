import { 
  LayoutDashboard, 
  Video, 
  BrainCircuit, 
  TrendingUp,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  user: any;
}

export default function Sidebar({ currentView, onNavigate, user }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sessions', label: 'Sessions', icon: Video },
    { id: 'quizzes', label: 'Quizzes', icon: BrainCircuit },
    { id: 'results', label: 'Results', icon: TrendingUp },
  ];

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-border z-50 flex flex-col">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-xl tracking-tight text-slate-text">LearnAI</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'quizzes' && currentView === 'view');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-sm transition-all group",
                isActive 
                  ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20" 
                  : "text-slate-400 hover:text-slate-text hover:bg-slate-50"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-brand-purple")} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-border space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-border">
          <img src={user?.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-text truncate">{user?.displayName}</p>
            <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{user?.email}</p>
          </div>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
