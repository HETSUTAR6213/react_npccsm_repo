import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SEMESTERS = [1, 2, 3, 4, 5, 6];

const ACCENTS = {
  emerald: {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'text-emerald-700',
  },
  blue: {
    active: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: 'text-blue-700',
  },
};

export default function Header({ icon, title, subtitle, accent = 'emerald', semester, onSemesterChange, right }) {
  const palette = ACCENTS[accent] || ACCENTS.emerald;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="glass-nav sticky top-0 z-40 px-4 md:px-8 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm h-12 w-12 overflow-hidden">
              <i className={`${icon} ${palette.icon} text-2xl`} />
            </div>
            <div>
              <h1 className="font-black text-xl md:text-2xl tracking-tight text-slate-900">{title}</h1>
              <p className="text-[11px] md:text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>{subtitle || 'NPCCSM • Kadi Sarva Vishwavidyalaya'}</span>
              </p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl text-rose-600 bg-rose-50 border border-rose-200 text-xs font-bold"
              >
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {right && <div>{right}</div>}

          {onSemesterChange && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 hidden lg:inline">
                SEM:
              </span>
              {SEMESTERS.map((sem) => (
                <button
                  key={sem}
                  onClick={() => onSemesterChange(sem)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm transition-all shrink-0 ${
                    sem === semester ? palette.active : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  SEM {sem}
                </button>
              ))}
            </div>
          )}

          {user && (
            <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-xs font-extrabold text-slate-800 leading-tight">{user.name}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <i className="fas fa-sign-out-alt text-xs" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
