/**
 * LLM client for the AI editorial review feature.
 * Prefers free Gemini if GEMINI_API_KEY is set, falls back to OpenAI.
 *
 * Env:
 *   GEMINI_API_KEY   optional — get free from aistudio.google.com/apikey
 *   GEMINI_MODEL     optional, defaults to gemini-2.0-flash
 *   OPENAI_API_KEY   optional — falls back to this if no Gemini key
 *   OPENAI_MODEL     optional, defaults to gpt-4o-mini
 */

const SYSTEM_PROMPT =
  'You are an impartial editorial assistant for an Indian politician rating site. ' +
  'Write a neutral, fact-based summary based ONLY on the structured profile data the user provides. ' +
  'You may add publicly known recent work or notable initiatives by this politician if you are confident, ' +
  'but DO NOT invent specific claims, allegations, or numbers. ' +
  'Keep the tone professional and even-handed. Avoid praise, partisan language, or defamation. ' +
  'Output 3 short paragraphs: (1) who they are and current role, ' +
  '(2) profile highlights from the data (education, criminal cases, assets — if disclosed), ' +
  '(3) recent public-facing work or constituency focus, if known. ' +
  'If you do not have reliable recent-work information, say so plainly instead of fabricating.';

async function generateReview(prompt) {
  if (process.env.GEMINI_API_KEY) return generateWithGemini(prompt);
  if (process.env.OPENAI_API_KEY) return generateWithOpenAI(prompt);
  const err = new Error(
    'No LLM API key configured. Set GEMINI_API_KEY (free) or OPENAI_API_KEY on the server.'
  );
  err.status = 503;
  throw err;
}

async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
  };

  let res, data;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    data = await res.json().catch(() => ({}));
    if (res.ok) break;
    // One quick retry on 429 — free tier is 15 req/min; brief pause often resolves.
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    const reason = data?.error?.status ? ` (${data.error.status})` : '';
    const detail = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(`Gemini${reason}: ${detail}`);
    err.status = 502;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
  if (!text) {
    const err = new Error('Gemini returned an empty response.');
    err.status = 502;
    throw err;
  }
  return { text, model };
}

async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 600,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    const err = new Error('OpenAI returned an empty response.');
    err.status = 502;
    throw err;
  }
  return { text, model };
}

function buildPrompt(neta) {
  const lines = [];
  lines.push(`Name: ${neta.name}`);
  if (neta.category) lines.push(`Role: ${neta.category}`);
  if (neta.party || neta.partyFull) lines.push(`Party: ${neta.partyFull || neta.party}`);
  if (neta.constituency) lines.push(`Constituency: ${neta.constituency}`);
  if (neta.state) lines.push(`State: ${neta.state}`);
  if (neta.election) lines.push(`Election: ${neta.election}`);
  if (neta.age != null) lines.push(`Age: ${neta.age}`);
  if (neta.education) {
    lines.push(`Education: ${neta.education}${neta.educationDetails ? ` (${neta.educationDetails})` : ''}`);
  }
  if (neta.selfProfession) lines.push(`Self profession: ${neta.selfProfession}`);
  if (neta.spouseProfession) lines.push(`Spouse profession: ${neta.spouseProfession}`);
  if (neta.assets) lines.push(`Declared assets: ${neta.assets}`);
  if (neta.liabilities) lines.push(`Declared liabilities: ${neta.liabilities}`);
  if (neta.criminalCases != null) {
    const extras = [];
    if (neta.pendingCases) extras.push(`${neta.pendingCases} pending`);
    if (neta.convictedCases) extras.push(`${neta.convictedCases} convicted`);
    lines.push(`Criminal cases: ${neta.criminalCases}${extras.length ? ` (${extras.join(', ')})` : ''}`);
  }
  if (neta.sourceUrl) lines.push(`Affidavit source: ${neta.sourceUrl}`);

  return (
    `Profile data:\n${lines.join('\n')}\n\n` +
    `Write a 3-paragraph editorial summary for this politician's page. ` +
    `If you know publicly reported recent work, debates, or constituency initiatives, mention them briefly in the third paragraph — otherwise say recent-work information was not available.`
  );
}

module.exports = { generateReview, buildPrompt };
