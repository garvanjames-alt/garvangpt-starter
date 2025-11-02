// backend/respondHandler.cjs
// Minimal, fast OpenAI Chat Completion call with a safe timeout.

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TIMEOUT_MS = 20000;

module.exports = async function respondHandler(req, res) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const q = (req.body && req.body.question) || '';
    if (!q) return res.status(400).json({ error: 'question required' });

    const messages = [
      { role: 'system', content: 'You are a concise, accurate medical information assistant.' },
      { role: 'user', content: q }
    ];

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), TIMEOUT_MS);

    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
      }),
    }).catch(err => {
      throw (err.name === 'AbortError')
        ? new Error(`OpenAI request timed out after ${TIMEOUT_MS}ms`)
        : err;
    });
    clearTimeout(timeout);

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `OpenAI ${r.status}`, detail: text.slice(0, 500) });
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || '(no answer)';
    return res.json({ answer });
  } catch (err) {
    return res.status(502).json({ error: 'respond failed', detail: String(err && err.message || err) });
  }
};
