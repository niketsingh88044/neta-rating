/**
 * Tiny OpenAI Chat Completions client. Uses global fetch (Node 18+).
 *
 * Env:
 *   OPENAI_API_KEY   required
 *   OPENAI_MODEL     optional, defaults to gpt-4o-mini
 */
async function generateReview(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured on the server.');
    err.status = 503;
    throw err;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an impartial editorial assistant for an Indian politician rating site. ' +
          'Write a neutral, fact-based summary based ONLY on the structured profile data the user provides. ' +
          'You may add publicly known recent work or notable initiatives by this politician if you are confident, ' +
          'but DO NOT invent specific claims, allegations, or numbers. ' +
          'Keep the tone professional and even-handed. Avoid praise, partisan language, or defamation. ' +
          'Output 3 short paragraphs: (1) who they are and current role, ' +
          '(2) profile highlights from the data (education, criminal cases, assets — if disclosed), ' +
          "(3) recent public-facing work or constituency focus, if known. " +
          'If you do not have reliable recent-work information, say so plainly instead of fabricating.',
      },
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
    err.status = res.status === 401 ? 502 : 502;
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
