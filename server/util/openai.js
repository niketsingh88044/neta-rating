/**
 * LLM client for the AI editorial review feature.
 * Calls Tavily (if configured) to fetch recent web context, then asks the LLM
 * to write a 3-paragraph editorial summary.
 *
 * Env:
 *   TAVILY_API_KEY   optional — free 1000 searches/month at tavily.com
 *   GEMINI_API_KEY   optional — preferred LLM if set
 *   GEMINI_MODEL     optional, defaults to gemini-2.0-flash
 *   OPENAI_API_KEY   optional — fallback LLM
 *   OPENAI_MODEL     optional, defaults to gpt-4o-mini
 */

const SYSTEM_PROMPT =
  'You are an impartial editorial assistant for an Indian politician rating site. ' +
  'Write a neutral, fact-based summary using the structured profile data AND the recent news snippets provided. ' +
  'When you cite recent activity, paraphrase what the news snippets actually say (debates, bills, attendance, ' +
  'constituency work, public statements, controversies, schemes launched). ' +
  'Do NOT invent specific claims, allegations, or numbers that are not in the profile data or the news snippets. ' +
  'Keep the tone professional and even-handed. Avoid praise, partisan language, or defamation. ' +
  'Output 3 short paragraphs: (1) who they are and current role, ' +
  '(2) profile highlights from the data (education, criminal cases, assets — if disclosed), ' +
  '(3) recent public-facing work, debates, or constituency activity grounded in the provided news snippets. ' +
  'If the news snippets contain nothing recent, then say so plainly.';

/* ---------------- Tavily web search ---------------- */

async function searchRecentNews(neta) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const queryParts = [neta.name];
  if (neta.constituency) queryParts.push(neta.constituency);
  if (neta.party) queryParts.push(neta.party);
  queryParts.push('India politician recent news');
  const query = queryParts.join(' ');

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        search_depth: 'basic',
        topic: 'news',
        days: 365,
        include_answer: false,
      }),
    });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
    console.log(`[tavily] status=${res.status} results=${data?.results?.length || 0}`);
    if (!res.ok) {
      console.warn('[tavily] error body:', raw.slice(0, 1000));
      return null;
    }
    return Array.isArray(data?.results) ? data.results : null;
  } catch (e) {
    console.warn('[tavily] failed:', e.message);
    return null;
  }
}

/* ---------------- Prompt building ---------------- */

function buildProfileBlock(neta) {
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
  return lines.join('\n');
}

function buildNewsBlock(results) {
  if (!results || !results.length) {
    return 'Recent news snippets: (none — say recent-work information was not available)';
  }
  const items = results.map((r, i) => {
    const content = (r.content || '').replace(/\s+/g, ' ').slice(0, 400);
    return `[${i + 1}] ${r.title || 'Untitled'}\n   ${content}\n   Source: ${r.url || ''}`;
  });
  return 'Recent news snippets (use these to write paragraph 3):\n' + items.join('\n\n');
}

function buildPrompt(neta, searchResults) {
  return (
    `Profile data:\n${buildProfileBlock(neta)}\n\n` +
    `${buildNewsBlock(searchResults)}\n\n` +
    `Write a 3-paragraph editorial summary for this politician's page.`
  );
}

/* ---------------- LLM dispatch ---------------- */

async function generateReview(neta) {
  const searchResults = await searchRecentNews(neta);
  const prompt = buildPrompt(neta, searchResults);

  let result;
  if (process.env.GEMINI_API_KEY) {
    result = await generateWithGemini(prompt);
  } else if (process.env.OPENAI_API_KEY) {
    result = await generateWithOpenAI(prompt);
  } else {
    const err = new Error(
      'No LLM API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY on the server.'
    );
    err.status = 503;
    throw err;
  }

  return { ...result, sources: searchResults?.map((r) => r.url).filter(Boolean) || [] };
}

/* ---------------- Gemini ---------------- */

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
        ? 'Gemini blocked this profile under its safety filters. Try writing the review manually, or switch to OpenAI.'
        : `Gemini returned no text (finishReason: ${finish}). Check Render logs for details.`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  return { text, model };
}

/* ---------------- OpenAI ---------------- */

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

module.exports = { generateReview };
