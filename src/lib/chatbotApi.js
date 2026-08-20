import { syllabusDatabase } from '../data/syllabusDatabase';

export async function askGemini({ prompt, subject, semester, unitName }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      subject,
      semester,
      unitName,
      syllabus: syllabusDatabase,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The study assistant request failed.');
  return data.answer;
}