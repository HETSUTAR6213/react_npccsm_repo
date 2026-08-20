import { useEffect, useRef, useState } from 'react';

function cleanMessageText(value) {
  return String(value || '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/[|*_~`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function TypingMessage({ text, onProgress }) {
  const cleanText = cleanMessageText(text);
  const [visibleText, setVisibleText] = useState('');
  const progressRef = useRef(onProgress);

  progressRef.current = onProgress;

  useEffect(() => {
    let index = 0;
    setVisibleText('');
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(cleanText.length / 160));
      setVisibleText(cleanText.slice(0, index));
      progressRef.current?.();
      if (index >= cleanText.length) {
        window.clearInterval(timer);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [cleanText]);

  return <span className="whitespace-pre-line">{visibleText}</span>;
}

export default function ChatbotWidget({
  open,
  onOpen,
  onClose,
  messages,
  prompt,
  onPromptChange,
  onSubmit,
  loading,
  subject,
  semester,
  savedNotes,
  onSaveNote,
}) {
  const [showNotes, setShowNotes] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, showNotes]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open study assistant"
        aria-expanded={open}
        className={`chat-launcher fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-violet-600 text-white shadow-xl shadow-violet-300/50 transition-all duration-300 hover:-translate-y-1 hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-200 ${open ? 'rotate-90 scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
        <i className="fas fa-comment-dots text-xl" />
      </button>

      <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
        <button type="button" aria-label="Close study assistant" onClick={onClose} className={`chat-backdrop absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Study assistant"
          className={`chat-drawer absolute bottom-0 right-0 flex h-[min(760px,100dvh)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-900/20 transition-all duration-300 sm:bottom-5 sm:right-5 sm:h-[min(700px,calc(100dvh-2.5rem))] sm:rounded-[2rem] ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-5 pb-5 pt-6 text-white">
            <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border-[18px] border-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl ring-1 ring-white/20">
                  <i className="fas fa-sparkles" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">Nova Study Assistant</h2>
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/70" />
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-violet-100">Your focused companion for exam prep</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close study assistant" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-violet-100 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="relative mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100">
              <span className="rounded-full bg-white/15 px-2.5 py-1">Semester {semester}</span>
              <span className="truncate rounded-full bg-white/15 px-2.5 py-1">{subject?.code || 'Select a course'}</span>
            </div>
            <button
              type="button"
              onClick={() => onPromptChange(`Give me important notes for Semester ${semester}, ${subject?.title || 'my selected subject'}, ${subject?.units?.[0]?.name || 'Unit I'}.`)}
              className="relative mt-3 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-white/20"
            >
              <i className="fas fa-wand-magic-sparkles mr-1.5" /> Use notes template
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#faf9ff_0%,#ffffff_35%)] p-4 custom-scrollbar">
            <div className="mx-auto flex max-w-[280px] items-center justify-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-2 text-center text-[10px] font-bold text-violet-700">
              <i className="fas fa-lock text-[9px]" /> Private study session
            </div>
            {messages.map((message) => (
              <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role !== 'user' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[11px] text-violet-600"><i className="fas fa-sparkles" /></div>}
                <div className="max-w-[82%]">
                  <div className={`rounded-2xl px-3.5 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'}`}>
                    {message.role === 'user' ? cleanMessageText(message.text) : (
                      <TypingMessage text={message.text} onProgress={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })} />
                    )}
                  </div>
                  {message.role !== 'user' && message.id !== 'welcome' && (
                    <button type="button" onClick={() => onSaveNote(message)} className="mt-1.5 px-1 text-[10px] font-bold text-violet-600 transition hover:text-violet-800">
                      <i className="far fa-bookmark mr-1" /> Save as my note
                    </button>
                  )}
                </div>
              </div>
            ))}
            {savedNotes?.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                <button type="button" onClick={() => setShowNotes((value) => !value)} className="flex w-full items-center justify-between text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                  <span><i className="fas fa-bookmark mr-1.5" /> My saved notes ({savedNotes.length})</span>
                  <i className={`fas fa-chevron-${showNotes ? 'up' : 'down'}`} />
                </button>
                {showNotes && (
                  <div className="mt-3 space-y-2">
                    {savedNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="rounded-xl border border-emerald-100 bg-white p-2.5 text-xs leading-5 text-slate-600">
                        <div className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-600">Semester {note.semester} • {note.subject}</div>
                        {note.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[11px] text-violet-600"><i className="fas fa-sparkles" /></div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                  <span className="chat-dot h-1.5 w-1.5 rounded-full bg-violet-400" /><span className="chat-dot h-1.5 w-1.5 rounded-full bg-violet-400" /><span className="chat-dot h-1.5 w-1.5 rounded-full bg-violet-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            {savedNotes?.length > 0 && <p className="mb-2 text-right text-[10px] font-bold text-emerald-600"><i className="fas fa-bookmark mr-1" /> {savedNotes.length} private note{savedNotes.length === 1 ? '' : 's'} saved</p>}
            <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-50">
              <input type="text" value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="Ask Nova anything about your course..." aria-label="Message Nova" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
              <button type="submit" disabled={loading} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300">
                <i className="fas fa-arrow-up text-sm" />
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] font-medium text-slate-400">Nova can make mistakes. Check important answers with your lecturer.</p>
          </div>
        </section>
      </div>
    </>
  );
}