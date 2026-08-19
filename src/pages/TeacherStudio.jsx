import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import Modal from '../components/shared/Modal';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function TeacherStudio() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [facultyName, setFacultyName] = useState('Prof. Faculty Member');
  const [lectureDate, setLectureDate] = useState(todayISO());
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { state, loading, usingFallback, publishUpdate, fetchHistory } = useSyllabus();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  useEffect(() => setSubjectIdx(0), [semester]);

  const activeSub = subjects[subjectIdx];
  const savedState = activeSub ? state[activeSub.code] : null;

  const [draft, setDraft] = useState({ coveredTopics: [], topicNotes: {} });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDraft({
      coveredTopics: savedState?.coveredTopics ? [...savedState.coveredTopics] : [],
      topicNotes: savedState?.topicNotes ? { ...savedState.topicNotes } : {},
    });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSub?.code, loading]);

  if (!activeSub) {
    return (
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header icon="fas fa-university" title="Faculty Studio" semester={semester} onSemesterChange={setSemester} />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 md:p-6 lg:p-8">
          <ConnectionBanner show={usingFallback} />
          <div className="glass-panel mt-6 rounded-[2rem] bg-white/85 p-8 text-center text-sm font-semibold text-slate-500">
            {loading ? 'Loading syllabus…' : `No syllabus data for Semester ${semester}.`}
          </div>
        </main>
      </div>
    );
  }

  const total = getTotalTopics(activeSub);
  const covered = draft.coveredTopics.length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const notesPending = draft.coveredTopics.filter((topic) => !draft.topicNotes[topic]?.trim()).length;

  function toggleTopic(topic) {
    setDraft((prev) => {
      const isChecked = prev.coveredTopics.includes(topic);
      const coveredTopics = isChecked
        ? prev.coveredTopics.filter((t) => t !== topic)
        : [...prev.coveredTopics, topic];
      return { ...prev, coveredTopics };
    });
    setErrors((prev) => ({ ...prev, [topic]: false }));
  }

  function setNote(topic, value) {
    setDraft((prev) => ({ ...prev, topicNotes: { ...prev.topicNotes, [topic]: value } }));
    if (value.trim()) setErrors((prev) => ({ ...prev, [topic]: false }));
  }

  function triggerReminderEmail() {
    if (typeof window === 'undefined') return;

    const recipient = 'faculty@college.edu';
    const sender = 'hetsuthar2157@gmail.com';
    const subject = encodeURIComponent(`Reminder: upload lecture update for ${activeSub.title}`);
    const body = encodeURIComponent(
      `Dear ${facultyName || 'Faculty Member'},\n\nThis is an automatic reminder from ${sender}. Please upload the lecture update for Semester ${semester} - ${activeSub.title}.\n\nPlease ensure each covered topic includes the required notes or important question before submitting the update.\n\nThank you.\nNPCCSM Portal`
    );

    window.location.href = `mailto:${recipient}?cc=${encodeURIComponent(sender)}&subject=${subject}&body=${body}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const missing = draft.coveredTopics.filter((t) => !draft.topicNotes[t]?.trim());
    if (missing.length > 0) {
      const nextErrors = {};
      missing.forEach((t) => (nextErrors[t] = true));
      setErrors(nextErrors);
      alert('Action Required: You must type an important question or note for EVERY topic you mark as covered.');
      triggerReminderEmail();
      return;
    }

    const topicNotes = {};
    draft.coveredTopics.forEach((t) => {
      topicNotes[t] = draft.topicNotes[t];
    });

    setSaving(true);
    await publishUpdate({
      subjectCode: activeSub.code,
      title: activeSub.title,
      semester,
      coveredTopics: draft.coveredTopics,
      topicNotes,
      overallNotes: 'Automatically tracked via portal.',
      lectureDate,
      facultyName: facultyName || 'Prof. Faculty Member',
    });
    setSaving(false);
    setShowSuccess(true);
  }

  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    setHistory(await fetchHistory());
    setHistoryLoading(false);
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Header icon="fas fa-university" title="Faculty Studio" semester={semester} onSemesterChange={setSemester} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        <div className="glass-panel rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 text-2xl text-emerald-600 shadow-lg shadow-emerald-100/80">
                <i className="fas fa-user-tie" />
              </div>
              <div>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="max-w-[260px] border-b border-emerald-200 bg-transparent pb-1 text-xl font-black text-slate-800 outline-none transition-all focus:border-emerald-400"
                  placeholder="Faculty Name"
                />
                <p className="mt-1 text-xs font-medium text-slate-500">Department of Computer Studies • BCA</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="mr-2 text-emerald-500"><i className="far fa-calendar-check" /></span>
                <span className="font-bold text-slate-500">Lecture date</span>
                <input
                  type="date"
                  value={lectureDate}
                  onChange={(e) => setLectureDate(e.target.value)}
                  className="ml-2 bg-transparent font-bold text-slate-800 outline-none"
                />
              </div>
              <button
                onClick={triggerReminderEmail}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100"
              >
                <i className="fas fa-paper-plane mr-2" />
                Send reminder email
              </button>
              <button
                onClick={openHistory}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              >
                <i className="fas fa-clock-rotate-left mr-2 text-emerald-500" />
                Class update logs
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Coverage" value={`${pct}%`} hint={`${covered}/${total} topics marked`} icon="fas fa-chart-line" tone="emerald" />
          <SummaryCard label="Subjects" value={String(subjects.length)} hint="Active courses in this semester" icon="fas fa-layer-group" tone="blue" />
          <SummaryCard label="Pending notes" value={String(notesPending)} hint={notesPending ? 'Required for marked topics' : 'All notes complete'} icon="fas fa-clipboard-check" tone="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="glass-panel rounded-[1.75rem] bg-white/80 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Semester courses</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sem {semester}</span>
              </div>
              <div className="space-y-3">
                {subjects.map((sub, idx) => {
                  const subState = state[sub.code] || { coveredTopics: [] };
                  const t = getTotalTopics(sub);
                  const c = subState.coveredTopics ? subState.coveredTopics.length : 0;
                  const p = t > 0 ? Math.round((c / t) * 100) : 0;
                  const isActive = idx === subjectIdx;

                  return (
                    <button
                      key={sub.code}
                      type="button"
                      onClick={() => setSubjectIdx(idx)}
                      className={`glass-panel-interactive w-full rounded-2xl border p-4 text-left transition-all ${
                        isActive ? 'border-emerald-200 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            <i className={sub.iconClass} />
                          </span>
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{sub.code}</div>
                            <div className="mt-1 text-xs font-bold text-slate-700">{sub.title}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700">{p}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="glass-panel rounded-[1.75rem] bg-white/80 p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
                    <i className={activeSub.iconClass} />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">{activeSub.code}</div>
                    <h2 className="text-lg font-black text-slate-800 md:text-xl">{activeSub.title}</h2>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  {pct}% covered
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  <span>Progress</span>
                  <span>{covered}/{total} topics</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {activeSub.units.map((unit, uIdx) => (
                  <div key={unit.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                    <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-600">
                        {uIdx + 1}
                      </span>
                      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-700">{unit.name}</h3>
                    </div>

                    <div className="space-y-3">
                      {unit.topics.map((topic) => {
                        const isCovered = draft.coveredTopics.includes(topic);
                        const hasError = errors[topic];

                        return (
                          <div key={topic} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                            <label className="flex cursor-pointer items-start gap-3">
                              <input type="checkbox" checked={isCovered} onChange={() => toggleTopic(topic)} className="hidden" />
                              <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${isCovered ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-slate-50 text-transparent'}`}>
                                <i className="fas fa-check" />
                              </div>
                              <span className={`text-[13px] font-semibold ${isCovered ? 'text-emerald-700' : 'text-slate-700'}`}>{topic}</span>
                            </label>

                            <div className="mt-3 pl-8">
                              <input
                                type="text"
                                value={draft.topicNotes[topic] || ''}
                                onChange={(e) => setNote(topic, e.target.value)}
                                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-700 outline-none transition-all ${
                                  hasError
                                    ? 'border-red-400 bg-red-50 ring-1 ring-red-200'
                                    : isCovered
                                    ? 'border-emerald-200 bg-emerald-50/30'
                                    : 'border-slate-200 bg-slate-50'
                                }`}
                                placeholder="Type an important exam question or note for this topic..."
                              />
                              {hasError && (
                                <span className="mt-1 block text-[10px] font-bold text-red-500">
                                  This note is required whenever the topic is marked covered.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-200 transition-all hover:brightness-105 disabled:opacity-60"
                >
                  <i className="fas fa-cloud-arrow-up text-base" />
                  {saving ? 'Publishing…' : 'Publish update'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Modal open={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[6px] border-emerald-100 bg-emerald-50 text-4xl text-emerald-600">
            <i className="fas fa-check" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-slate-800">Update published</h3>
          <p className="mt-2 text-sm text-slate-500">Topic statuses and mandatory exam notes have been synced to the student portal.</p>
          <button
            onClick={() => setShowSuccess(false)}
            className="mt-6 w-full rounded-2xl bg-slate-800 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-white transition-colors hover:bg-slate-900"
          >
            Continue
          </button>
        </div>
      </Modal>

      <Modal open={showHistory} onClose={() => setShowHistory(false)}>
        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl md:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-black uppercase tracking-[0.14em] text-slate-800">Class update history</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
            >
              <i className="fas fa-xmark" />
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {historyLoading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading history…</p>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">
                No previous class updates recorded.
              </div>
            ) : (
              history.map((log, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <span className="text-sm font-black text-slate-800">{log.code} - {log.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      <i className="far fa-calendar-alt mr-1 text-emerald-500" /> {log.date}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-bold text-emerald-600">Faculty:</span> {log.faculty} •
                    <span className="font-bold text-slate-700"> Semester:</span> {log.semester}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, hint, icon, tone }) {
  const tones = {
    emerald: { bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  };

  const style = tones[tone] || tones.emerald;

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">{hint}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${style.border} ${style.bg}`}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}
