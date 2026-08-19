import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    path: '/student',
    icon: 'fas fa-user-graduate',
    gradient: 'from-cyan-500 via-sky-500 to-blue-600',
    glow: 'shadow-sky-500/30',
    desc: 'Track covered topics and exam-ready notes',
    defaultUser: 'student',
    defaultPass: 'student123',
  },
  {
    id: 'teacher',
    label: 'Faculty',
    path: '/teacher',
    icon: 'fas fa-university',
    gradient: 'from-teal-500 via-cyan-500 to-sky-600',
    glow: 'shadow-cyan-500/30',
    desc: 'Publish lectures, notes, and completion updates',
    defaultUser: 'teacher',
    defaultPass: 'teacher123',
  },
  {
    id: 'principal',
    label: 'Principal',
    path: '/principal',
    icon: 'fas fa-user-shield',
    gradient: 'from-violet-500 via-indigo-500 to-blue-600',
    glow: 'shadow-violet-500/30',
    desc: 'Monitor semester-wise academic delivery and coverage',
    defaultUser: 'principal',
    defaultPass: 'principal123',
  },
];

const snapshotStats = [
  { label: 'Roles', value: '03', icon: 'fas fa-user-cog' },
  { label: 'Semesters', value: '06', icon: 'fas fa-layer-group' },
  { label: 'Sync', value: 'Live', icon: 'fas fa-wifi' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const [activeRole, setActiveRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(location.state?.error || location.state?.message || '');

  if (user) {
    const roleTarget = ROLES.find((r) => r.id === user.role)?.path || '/student';
    navigate(roleTarget, { replace: true });
  }

  const selectedRoleConfig = ROLES.find((r) => r.id === activeRole) || ROLES[0];

  const handleRoleChange = (roleId) => {
    setActiveRole(roleId);
    setErrorMsg('');
  };

  const handleQuickFill = () => {
    setUsername(selectedRoleConfig.defaultUser);
    setPassword(selectedRoleConfig.defaultPass);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await login({
        username,
        password,
        role: activeRole,
      });

      if (res.success) {
        navigate(selectedRoleConfig.path, { replace: true });
      } else {
        setErrorMsg(res.error || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during login. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="premium-shell relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-7xl grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6 animate-[riseUp_0.6s_ease-out]">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700 shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Academic command center
          </div>

          <div className="space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-100 to-indigo-50 text-2xl text-sky-700 shadow-lg shadow-sky-100/60">
              <i className="fas fa-graduation-cap" />
            </div>
            <h1 className="max-w-xl text-4xl font-black tracking-[-0.05em] text-slate-900 sm:text-5xl">
              NPCCSM portal designed for clarity, speed, and insight.
            </h1>
            <p className="max-w-xl text-base text-slate-600 sm:text-lg">
              A smarter academic workflow for students, faculty, and leadership to manage syllabus coverage, lecture updates, and institutional visibility in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {snapshotStats.map((item) => (
              <div key={item.label} className="hero-stat-card rounded-2xl p-4 text-slate-900">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
                  <i className={item.icon} />
                </div>
                <div className="text-2xl font-black tracking-tight text-slate-900">{item.value}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Live workflow</p>
                <h2 className="mt-1 text-lg font-black text-slate-800">Everything connected to one syllabus source</h2>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Ready
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Student view</div>
                <div className="mt-1 text-sm font-bold text-slate-800">Lecture notes & coverage</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Faculty view</div>
                <div className="mt-1 text-sm font-bold text-slate-800">Publish updates in seconds</div>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">Leadership view</div>
                <div className="mt-1 text-sm font-bold text-slate-800">Track completion across semester</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg animate-[riseUp_0.7s_ease-out]">
          <div className={`absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br ${selectedRoleConfig.gradient} opacity-10 blur-3xl`} />
          <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Welcome back</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Sign in</h2>
              </div>
              <div className={`rounded-2xl bg-gradient-to-r ${selectedRoleConfig.gradient} p-3 text-white shadow-lg ${selectedRoleConfig.glow}`}>
                <i className={`${selectedRoleConfig.icon} text-lg`} />
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {ROLES.map((role) => {
                  const isActive = role.id === activeRole;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      data-active={isActive}
                      onClick={() => handleRoleChange(role.id)}
                      className="role-selector-button flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-[11px] font-bold transition-all duration-200 hover:bg-white/80"
                    >
                      <i className={`${role.icon} ${isActive ? 'text-sky-600' : 'text-slate-400'} mb-1 text-base`} />
                      <span className={isActive ? 'text-slate-800' : 'text-slate-600'}>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mb-4 text-center text-[11px] font-semibold text-slate-500">{selectedRoleConfig.desc}</p>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <i className="fas fa-exclamation-circle mt-0.5 text-base" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                <span className="flex items-center gap-2">
                  <i className="fas fa-bolt text-amber-500" />
                  Local demo mode
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="rounded-lg bg-amber-200/80 px-2 py-1 font-extrabold uppercase tracking-[0.12em] text-amber-900 transition-colors hover:bg-amber-300"
                >
                  Fill demo
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <i className="fas fa-user" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter ${selectedRoleConfig.label.toLowerCase()} username`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <i className="fas fa-lock" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium text-slate-800 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 transition-colors hover:text-slate-600"
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-sm font-bold text-sky-600 transition-colors hover:text-sky-700"
                >
                  Auto-fill {selectedRoleConfig.label} demo credentials
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${selectedRoleConfig.gradient} px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 ${selectedRoleConfig.glow}`}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying
                  </>
                ) : (
                  <>
                    Continue
                    <i className="fas fa-arrow-right text-xs" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
