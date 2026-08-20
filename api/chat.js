const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Only POST requests are supported.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({ error: 'The study assistant is not configured yet. Add GEMINI_API_KEY in Vercel Project Settings.' });
  }

  const { prompt, semester, subject, unitName, syllabus } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
    return response.status(400).json({ error: 'Please enter a study question.' });
  }

  const syllabusText = formatSyllabus(syllabus);
  const instructions = `You are Nova, the NPCCSM syllabus study assistant. Answer the student's question in simple, clear English.

Rules:
- Use the syllabus reference below as your source of truth for semester, subject, unit, and topics.
- If the student names a semester, subject, and unit, answer that exact request directly. Do not ask them to wait for a teacher or say that notes must be published by a teacher.
- If the student asks for important notes, give concise exam-ready notes with headings, definitions, key points, and a short example where useful.
- If the student asks for an answer, explain it step by step at undergraduate level.
- If a requested topic is not in the syllabus, say that clearly and offer the closest syllabus topic. Never invent a syllabus topic.
- Prefer useful answers over follow-up questions. Only ask a clarification when the request cannot be matched at all.
- Current dashboard context: semester ${semester || 'unknown'}, subject ${subject?.code || 'unknown'} - ${subject?.title || 'unknown'}, unit ${unitName || 'unknown'}.

Complete syllabus reference:
${syllabusText}

Student question:
${prompt.trim()}`;

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a patient, accurate academic tutor.' }] },
        contents: [{ role: 'user', parts: [{ text: instructions }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 1200 },
      }),
    });

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      console.error('[chat] Gemini error:', data);
      return response.status(502).json({ error: 'Nova could not reach the study model. Please try again shortly.' });
    }

    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!answer) return response.status(502).json({ error: 'Nova received an empty answer. Please try again.' });
    return response.status(200).json({ answer });
  } catch (error) {
    console.error('[chat] Request failed:', error);
    return response.status(500).json({ error: 'Nova is temporarily unavailable. Please try again shortly.' });
  }
}

function formatSyllabus(syllabus) {
  if (!syllabus || typeof syllabus !== 'object') return 'No syllabus data was provided.';

  return Object.entries(syllabus).map(([semester, subjects]) => {
    const courses = (subjects || []).map((course) => {
      const units = (course.units || []).map((unit) => `${unit.name}: ${unit.topics.join('; ')}`).join(' | ');
      return `${course.code} - ${course.title} [${units}]`;
    }).join('\n');
    return `Semester ${semester}:\n${courses}`;
  }).join('\n\n');
}