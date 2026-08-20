const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Only POST requests are supported.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({ error: 'The study assistant is not configured yet. Add GEMINI_API_KEY in Vercel Project Settings.' });
  }

  const { prompt, semester, subject, unitName, syllabus, knowledgeBase, conversation } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
    return response.status(400).json({ error: 'Please enter a study question.' });
  }

  const syllabusText = formatSyllabus(syllabus);
  const instructions = `You are Nova, the NPCCSM syllabus study assistant. Answer the student's question in simple, clear English.

Rules:
- Use the syllabus reference below as your source of truth for semester, subject, unit, and topics.
- If the student names a semester, subject, and unit, answer that exact request directly. Do not ask them to wait for a teacher or say that notes must be published by a teacher.
- If the student asks for important notes, give concise exam-ready notes with plain headings such as Meaning, Key points, Example, and Remember.
- If the student asks for an answer, explain it step by step at undergraduate level in a warm, natural tutor voice.
- You can also answer general computer science questions such as OOP, API keys, databases, programming, and web development. Connect them to the student's course when useful.
- If a requested topic is not in the syllabus, say that clearly and offer the closest syllabus topic. Never invent a syllabus topic.
- Prefer useful answers over follow-up questions. Only ask a clarification when the request cannot be matched at all.
- Return plain text only. Do not use Markdown, asterisks, hash symbols, slash-star comments, plus signs, hyphen bullets, table pipes, emojis, or decorative separators. Use short headings on their own lines and numbered points such as 1. 2. 3. when a list is needed.
- Never begin with filler such as Here is, Sure, or Absolutely. Start with the answer.
- Current dashboard context: semester ${semester || 'unknown'}, subject ${subject?.code || 'unknown'} - ${subject?.title || 'unknown'}, unit ${unitName || 'unknown'}.

Complete syllabus reference:
${syllabusText}

Teacher published knowledge and important notes:
${formatKnowledgeBase(knowledgeBase)}

Recent conversation:
${formatConversation(conversation)}

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

    const answer = cleanAnswer(data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim());
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

function formatKnowledgeBase(knowledgeBase) {
  if (!knowledgeBase || typeof knowledgeBase !== 'object') return 'No teacher updates have been published yet.';

  const entries = Object.values(knowledgeBase).filter(Boolean).map((entry) => {
    const notes = Object.entries(entry.topicNotes || {}).map(([topic, note]) => `${topic}: ${note}`).join(' | ');
    return `${entry.code || 'Subject'} - ${entry.title || ''}; Covered topics: ${(entry.coveredTopics || []).join(', ')}; Teacher notes: ${notes || 'None'}`;
  });
  return entries.length ? entries.join('\n') : 'No teacher updates have been published yet.';
}

function formatConversation(conversation) {
  if (!Array.isArray(conversation) || conversation.length === 0) return 'This is the first message.';
  return conversation.slice(-10).map((message) => `${message.role === 'user' ? 'Student' : 'Nova'}: ${cleanAnswer(message.text || '')}`).join('\n');
}

function cleanAnswer(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/[|*_~`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}