import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import ChatbotWidget from '../components/shared/ChatbotWidget';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import { useAuth } from '../context/AuthContext';
import { askGemini } from '../lib/chatbotApi';

const STUDENT_NOTES_KEY = 'npccsm_student_notes_v1';

export default function StudentPortal() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [assistantPrompt, setAssistantPrompt] = useState('Give me the important questions of this semester, this subject, and this unit.');
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'I can summarize topics, highlight key points, generate important questions, and answer study queries for your selected subject and unit.',
    },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [savedNotes, setSavedNotes] = useState([]);
  const { state, loading, usingFallback } = useSyllabus();
  const { user } = useAuth();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`);
      setSavedNotes(stored ? JSON.parse(stored) : []);
    } catch (error) {
      setSavedNotes([]);
    }
  }, [user?.id]);

  function handleSaveNote(message) {
    const note = {
      id: `${Date.now()}-${message.id}`,
      text: message.text,
      semester,
      subject: activeSub?.title || 'General syllabus',
      unit: activeSub?.units?.[0]?.name || 'General notes',
      createdAt: new Date().toISOString(),
    };
    const nextNotes = [note, ...savedNotes].slice(0, 50);
    setSavedNotes(nextNotes);
    localStorage.setItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`, JSON.stringify(nextNotes));
  }

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  useEffect(() => setSubjectIdx(0), [semester]);

  const activeSub = subjects[subjectIdx];
  const subState = activeSub ? state[activeSub.code] : null;

  const totalTopics = activeSub ? getTotalTopics(activeSub) : 0;
  const coveredTopics = subState?.coveredTopics?.length || 0;
  const completion = totalTopics ? Math.round((coveredTopics / totalTopics) * 100) : 0;
  const notesCount = subState?.topicNotes ? Object.keys(subState.topicNotes).length : 0;

  async function handleStudyAssistantSubmit(e) {
    e.preventDefault();
    const trimmedPrompt = assistantPrompt.trim();
    if (!trimmedPrompt) return;

    const userMessage = { id: `${Date.now()}-user`, role: 'user', text: trimmedPrompt };
    setAssistantMessages((prev) => [...prev, userMessage]);
    setAssistantPrompt('');
    setAssistantLoading(true);

    try {
      const unitName = activeSub?.units?.[0]?.name || 'Current unit';
      const answer = await askGemini({
        prompt: trimmedPrompt,
        subject: activeSub,
        semester,
        unitName,
        knowledgeBase: state,
        conversation: assistantMessages,
      });

      setAssistantMessages((prev) => [...prev, { id: `${Date.now()}-bot`, role: 'bot', text: answer }]);
    } catch (error) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          role: 'bot',
          text: 'I hit a temporary issue while preparing the answer. Please try again in a moment.',
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Header
        icon="fas fa-user-graduate"
        title="Student Portal"
        accent="emerald"
        semester={semester}
        onSemesterChange={setSemester}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        <div key={`summary-${semester}-${activeSub?.code || 'empty'}`} className="content-change glass-panel rounded-[2rem] border-l-4 border-l-emerald-500 bg-white/85 p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">Student dashboard</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">NPCCSM study progress</h2>
            </div>
            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              {loading ? 'Loading' : `${completion}% completion`}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SummaryCard label="Current course" value={activeSub ? activeSub.code : '—'} hint={activeSub ? activeSub.title : 'No active subject'} icon="fas fa-book-open" tone="emerald" />
            <SummaryCard label="Coverage" value={activeSub ? `${completion}%` : '0%'} hint={activeSub ? `${coveredTopics}/${totalTopics} topics covered` : 'No topic data'} icon="fas fa-chart-line" tone="blue" />
            <SummaryCard label="Exam notes" value={String(notesCount)} hint={notesCount ? 'Important questions published' : 'No notes yet'} icon="fas fa-lightbulb" tone="amber" />
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Select subject</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{subjects.length} courses</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {subjects.length === 0 ? (
              <span className="px-1 text-xs text-slate-400">No courses for this semester.</span>
            ) : (
              subjects.map((sub, idx) => {
                const courseState = state[sub.code] || { coveredTopics: [] };
                const courseCovered = courseState.coveredTopics?.length || 0;
                const courseTotal = getTotalTopics(sub);
                const coursePercent = courseTotal ? Math.round((courseCovered / courseTotal) * 100) : 0;
                const isActive = idx === subjectIdx;

                return (
                  <button
                    key={sub.code}
                    onClick={() => setSubjectIdx(idx)}
                    type="button"
                    className={`shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                      isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <i className={sub.iconClass} />
                      </span>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]">{sub.code}</div>
                        <div className="mt-0.5 text-xs font-bold">{coursePercent}%</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div key={`courses-${semester}-${activeSub?.code || 'empty'}`} className="content-change grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <i className="fas fa-rss" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Lecture updates</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{activeSub ? activeSub.title : 'No subject selected'}</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                  {loading ? 'Loading…' : activeSub ? 'Updated' : 'Pending'}
                </span>
              </div>
              <div className="mt-5">
                <UpdatesFeed subState={subState} loading={loading} semester={semester} subjects={subjects} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 md:p-6">
              <h3 className="border-b border-slate-100 pb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Course coverage</h3>
              <div className="mt-4 space-y-4">
                {activeSub && activeSub.units.map((unit) => (
                  <div key={unit.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600">{unit.name}</h4>
                      <span className="text-[10px] font-bold text-slate-500">{unit.topics.length} items</span>
                    </div>
                    <div className="space-y-2">
                      {unit.topics.map((topic) => {
                        const isDone = subState?.coveredTopics?.includes(topic);
                        return (
                          <div key={topic} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <span className={`text-[11px] font-semibold ${isDone ? 'text-emerald-700' : 'text-slate-500'}`}>{topic}</span>
                            <i className={`fas ${isDone ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300'} text-xs`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
      <ChatbotWidget
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        messages={assistantMessages}
        prompt={assistantPrompt}
        onPromptChange={setAssistantPrompt}
        onSubmit={handleStudyAssistantSubmit}
        loading={assistantLoading}
        subject={activeSub}
        semester={semester}
        savedNotes={savedNotes}
        onSaveNote={handleSaveNote}
      />
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
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">{hint}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${style.border} ${style.bg}`}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}

function UpdatesFeed({ subState, loading, semester, subjects }) {
  if (loading) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">Loading updates…</div>;
  }

  if (subjects.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">Syllabus is currently pending upload for Semester {semester}.</div>;
  }

  if (!subState || !subState.coveredTopics || subState.coveredTopics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">
        No lecture updates published yet for this course.
      </div>
    );
  }

  const hasNotes = subState.topicNotes && Object.keys(subState.topicNotes).length > 0;

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Instructor</p>
          <h4 className="mt-1 text-base font-black text-slate-800">{subState.facultyName || 'NPCCSM Faculty'}</h4>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
          <i className="far fa-calendar-alt mr-1 text-emerald-500" /> {subState.lastUpdated || 'Recently'}
        </span>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Covered topics</p>
        <div className="flex flex-wrap gap-2">
          {subState.coveredTopics.map((t) => (
            <span key={t} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              {t}
            </span>
          ))}
        </div>
      </div>

      {hasNotes && (
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
            <i className="fas fa-question-circle mr-1.5" /> Exam focus
          </p>
          {Object.entries(subState.topicNotes).map(([topic, note]) => (
            <div key={topic} className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-700">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">{topic}</span>
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
