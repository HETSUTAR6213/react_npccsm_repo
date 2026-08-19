import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, REST_ENDPOINT } from '../lib/supabaseClient';

const LOCAL_STORAGE_KEY = 'npccsm_academic_state_v3';
const SyllabusContext = createContext(null);

const normalizeLectureRow = (row) => ({
  code: row.subject_code,
  title: row.title || 'Faculty Lecture Update',
  semester: row.semester,
  coveredTopics: Array.isArray(row.covered_topic) ? row.covered_topic : row.covered_topics || [],
  topicNotes: row.mandatory_note && typeof row.mandatory_note === 'object' ? row.mandatory_note : row.topic_notes || {},
  overallNotes: row.overall_notes || '',
  facultyName: row.faculty_name || 'NPCCSM Faculty',
  lastUpdated: row.lecture_date || row.last_updated,
  createdAt: row.created_at,
});

/**
 * Loads/saves per-subject progress state ({ [subjectCode]: { coveredTopics, topicNotes, ... } }).
 * Supabase is the source of truth when configured; otherwise this transparently
 * falls back to localStorage, mirroring the original static-HTML behaviour.
 */
export function SyllabusProvider({ children }) {
  const [state, setState] = useState({});
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(!isSupabaseConfigured);

  const loadLocal = () => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const saveLocal = (next) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  };

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState(loadLocal());
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from('faculty_lecture_updates').select('*');
      if (error) throw error;

      const byCode = {};
      for (const row of data) {
        const normalized = normalizeLectureRow(row);
        const existing = byCode[normalized.code];

        if (!existing || new Date(normalized.createdAt || 0) > new Date(existing.createdAt || 0)) {
          byCode[normalized.code] = normalized;
        }
      }

      setState(byCode);
      setUsingFallback(false);
    } catch (err) {
      console.error('[SyllabusContext] Supabase read failed, using local fallback:', err.message);
      setState(loadLocal());
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('faculty_lecture_updates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_lecture_updates' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const publishUpdate = useCallback(
    async ({ subjectCode, title, semester, coveredTopics, topicNotes, overallNotes, lectureDate, facultyName }) => {
      const payload = {
        code: subjectCode,
        title,
        semester,
        coveredTopics,
        topicNotes,
        overallNotes,
        lastUpdated: lectureDate,
        facultyName,
      };


      if (!isSupabaseConfigured) {
        const next = { ...loadLocal(), [subjectCode]: payload };
        saveLocal(next);
        setState(next);
        setUsingFallback(true);
        return { ok: true, fallback: true };
      }

      try {
        const insertPayload = {
          subject_code: subjectCode,
          title,
          semester,
          faculty_name: facultyName,
          lecture_date: lectureDate,
          covered_topic: coveredTopics,
          mandatory_note: topicNotes,
          created_at: new Date().toISOString(),
        };

        const { error: lectureError } = await supabase.from('faculty_lecture_updates').insert(insertPayload);
        if (lectureError) throw lectureError;

        const { error: progressError } = await supabase.from('syllabus_progress').upsert({
          subject_code: subjectCode,
          title,
          semester,
          covered_topics: coveredTopics,
          topic_notes: topicNotes,
          overall_notes: overallNotes,
          faculty_name: facultyName,
          last_updated: lectureDate,
          updated_at: new Date().toISOString(),
        });
        if (progressError) {
          console.warn('[SyllabusContext] syllabus_progress sync warning:', progressError.message);
        }

        const { error: historyError } = await supabase.from('syllabus_history').insert({
          subject_code: subjectCode,
          title,
          semester,
          faculty_name: facultyName,
          lecture_date: lectureDate,
          covered_topics: coveredTopics,
          topic_notes: topicNotes,
        });
        if (historyError) {
          console.warn('[SyllabusContext] syllabus_history sync warning:', historyError.message);
        }

        const { error: submissionError } = await supabase.from('teacher_submissions').insert({
          subject_code: subjectCode,
          lecture_date: lectureDate,
          covered_topic: coveredTopics,
          mandatory_note: topicNotes,
          created_at: new Date().toISOString(),
        });
        if (submissionError) {
          console.warn('[SyllabusContext] teacher_submissions insert warning:', submissionError.message);
        }

        try {
          const restApiKey =
            import.meta.env.VITE_SUPABASE_ANON_KEY ||
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_SECRET_KEY ||
            'sb_publishable_EzroXR9eDGtMDlIU4mfLpA_R-C30Uwc';

          await fetch(REST_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: restApiKey,
              Authorization: `Bearer ${restApiKey}`,
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              subject_code: subjectCode,
              title,
              semester,
              faculty_name: facultyName,
              lecture_date: lectureDate,
              covered_topic: coveredTopics,
              mandatory_note: topicNotes,
              created_at: new Date().toISOString(),
            }),
          });
        } catch (restErr) {
          console.warn('[SyllabusContext] Direct REST endpoint POST warning:', restErr.message);
        }

        await refresh();
        return { ok: true, fallback: false };
      } catch (err) {
        console.error('[SyllabusContext] Supabase write failed, saving locally instead:', err.message);
        const next = { ...loadLocal(), [subjectCode]: payload };
        saveLocal(next);
        setState(next);
        setUsingFallback(true);
        return { ok: true, fallback: true, error: err.message };
      }
    },
    [refresh]
  );

  const fetchHistory = useCallback(async () => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('faculty_lecture_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.map((log) => ({
        code: log.subject_code,
        title: log.title || 'Faculty Lecture Update',
        semester: log.semester,
        faculty: log.faculty_name || 'NPCCSM Faculty',
        date: log.lecture_date,
      }));
    } catch (err) {
      console.error('[SyllabusContext] Failed to load history:', err.message);
      return [];
    }
  }, []);

  const value = {
    state,
    loading,
    usingFallback,
    refresh,
    publishUpdate,
    fetchHistory,
  };

  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
}

export function useSyllabus() {
  const ctx = useContext(SyllabusContext);
  if (!ctx) throw new Error('useSyllabus must be used within a SyllabusProvider');
  return ctx;
}
