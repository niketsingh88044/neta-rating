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
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
    // Live Google Search — lets the model ground the third paragraph on real
    // recent news / constituency activity instead of guessing.
    tools: [{ google_search: {} }],
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  let res, raw = '', data = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
      body: JSON.stringify(body),
    });
    raw = await res.text();
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    console.log(`[gemini] model=${model} status=${res.status} bodyLen=${raw.length}`);
    if (res.ok && data?.candidates?.length) break;
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    if (!res.ok) {
      console.warn('[gemini] error body:', raw.slice(0, 2000));
      const reason = data?.error?.status ? ` (${data.error.status})` : '';
      const detail = data?.error?.message || `HTTP ${res.status}`;
      const err = new Error(`Gemini${reason}: ${detail}`);
      err.status = 502;
      throw err;
    }
    break;
  }

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join('').trim();
  if (!text) {
    console.warn('[gemini] empty response raw:', raw.slice(0, 2000));
    const finish = candidate?.finishReason || data?.promptFeedback?.blockReason || 'EMPTY';
    const msg =
      finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT'
        ? 'Gemini blocked this profile under its safety filters (often happens with criminal-case data). Try writing the review manually, or switch to OpenAI.'
        : `Gemini returned no text (finishReason: ${finish}). Check Render logs for details.`;
    const err = new Error(msg);
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
    max_tokens: 1200,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  console.log(`[openai] model=${model} status=${res.status} bodyLen=${raw.length}`);
  if (!res.ok) {
    console.warn('[openai] error body:', raw.slice(0, 2000));
    const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  const choice = data?.choices?.[0];
  const text = choice?.message?.content?.trim();
  if (!text) {
    console.warn('[openai] empty response raw:', raw.slice(0, 2000));
    const finish = choice?.finish_reason || 'EMPTY';
    const msg =
      finish === 'content_filter'
        ? 'OpenAI blocked this profile under its content policy. Write the review manually or edit the profile data and retry.'
        : `OpenAI returned no text (finish_reason: ${finish}). Check Render logs for the raw response.`;
    const err = new Error(msg);
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
