import { useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';

export default function PrincipalDashboard() {
  const [semester, setSemester] = useState(5);
  const { state, loading, usingFallback } = useSyllabus();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);

  const overview = useMemo(() => {
    if (!subjects.length) {
      return { totalTopics: 0, coveredTopics: 0, avgCompletion: 0, atRisk: 0 };
    }

    let totalTopics = 0;
    let coveredTopics = 0;
    let atRisk = 0;

    subjects.forEach((sub) => {
      const subState = state[sub.code] || { coveredTopics: [] };
      const total = getTotalTopics(sub);
      const covered = subState.coveredTopics ? subState.coveredTopics.length : 0;
      totalTopics += total;
      coveredTopics += covered;
      if (total > 0 && Math.round((covered / total) * 100) < 60) {
        atRisk += 1;
      }
    });

    return {
      totalTopics,
      coveredTopics,
      avgCompletion: totalTopics ? Math.round((coveredTopics / totalTopics) * 100) : 0,
      atRisk,
    };
  }, [subjects, state]);

  return (
    <div className="principal-shell relative z-10 flex min-h-screen flex-col">
      <Header
        icon="fas fa-user-shield"
        title="Principal Dashboard"
        accent="blue"
        semester={semester}
        onSemesterChange={setSemester}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Semester completion"
            value={`${overview.avgCompletion}%`}
            hint={`${overview.coveredTopics}/${overview.totalTopics} topics covered`}
            icon="fas fa-chart-line"
            tone="blue"
          />
          <SummaryCard
            label="Courses tracked"
            value={String(subjects.length)}
            hint="Subjects currently active"
            icon="fas fa-book-open"
            tone="emerald"
          />
          <SummaryCard
            label="At-risk subjects"
            value={String(overview.atRisk)}
            hint="Below 60% completion"
            icon="fas fa-triangle-exclamation"
            tone="amber"
          />
          <SummaryCard
            label="Faculty updates"
            value={loading ? '…' : 'Live'}
            hint={usingFallback ? 'Offline fallback mode' : 'Synchronized'}
            icon="fas fa-bolt"
            tone="violet"
          />
        </div>

        <div className="professional-panel rounded-[2rem] border-l-4 border-l-sky-500 p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-600">Academic overview</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Semester {semester} syllabus health
              </h2>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-700">
              {subjects.length ? `${overview.avgCompletion}% overall coverage` : 'No curriculum'}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                Loading syllabus data…
              </div>
            ) : subjects.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                No syllabus data for Semester {semester}.
              </div>
            ) : (
              subjects.map((sub) => {
                const subState = state[sub.code] || { coveredTopics: [] };
                const total = getTotalTopics(sub);
                const covered = subState.coveredTopics ? subState.coveredTopics.length : 0;
                const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
                const isLow = pct < 60;

                return (
                  <div
                    key={sub.code}
                    className="metric-card rounded-2xl p-4"
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm">
                          <i className={sub.iconClass} />
                        </span>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{sub.code}</div>
                          <div className="text-xs font-bold text-slate-400">{sub.type}</div>
                        </div>
                      </div>
                      <div className={`rounded-full px-2 py-1 text-[10px] font-black ${isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {pct}%
                      </div>
                    </div>

                    <h3 className="relative z-10 mt-4 text-sm font-black uppercase tracking-tight text-slate-800" title={sub.title}>
                      {sub.title}
                    </h3>

                    <div className="relative z-10 mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${isLow ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-sky-500 to-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="relative z-10 mt-4 flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>{covered} / {total} covered</span>
                      <span>{isLow ? 'Needs attention' : 'On track'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, hint, icon, tone }) {
  const tones = {
    blue: { bg: 'bg-sky-50 text-sky-700', ring: 'border-sky-100' },
    emerald: { bg: 'bg-emerald-50 text-emerald-700', ring: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50 text-amber-700', ring: 'border-amber-100' },
    violet: { bg: 'bg-violet-50 text-violet-700', ring: 'border-violet-100' },
  };

  const style = tones[tone] || tones.blue;

  return (
    <div className="kpi-tile rounded-2xl p-4">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">{hint}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${style.ring} ${style.bg}`}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}
