// backend/respondHandler.cjs
// RAG‑lite: retrieve top local snippets, feed them to the model, return answer + sources.

'use strict';

const OpenAI = require('openai');
const Client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { ensureIndex, queryDocs } = require('./query.cjs');
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const PERSONA = [
  'You are a friendly, safety‑first pharmacist who answers clearly and concisely.',
  "If you’re not sure, say so and recommend contacting a clinician.",
  'Be brief and list‑like when helpful. Do not fabricate sources.'
].join('\n');

function makeContext(hits = []) {
  if (!hits.length) return '(no local sources matched)';
  return hits
    .map((h, i) => `#${i + 1} ${h.file}: ${h.snippet}`)
    .join('\n');
}

module.exports = async function respondHandler(req, res) {
  try {
    const { question = '', minScore = 0.1 } = req.body || {};

    // 1) Retrieve local sources (already normalized to [0,1])
    ensureIndex();
    const hits = queryDocs(question, { k: 6 });
    const usable = (hits || []).filter(h => (h.score || 0) >= Math.max(0, minScore)).slice(0, 6);

    // 2) Ask the model with sources as context
    const messages = [
      { role: 'system', content: PERSONA },
      {
        role: 'system',
        content: [
          'Use the provided SOURCE EXCERPTS when possible.',
          'Cite specific points from them. If sources do not contain the answer, say so and suggest next steps.',
          'Avoid inventing citations.'
        ].join(' ')
      },
      { role: 'user', content: `QUESTION:\n${question}` },
      { role: 'user', content: `SOURCE EXCERPTS:\n${makeContext(usable)}` },
    ];

    const out = await Client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 600,
      messages,
    });

    const answer = out?.choices?.[0]?.message?.content?.trim() || '(no answer)';

    res.json({ answer, sources: usable, usedMemories: [] });
  } catch (err) {
    console.error('respondHandler error:', err?.status || '', err?.message || err);
    res.status(500).json({
      answer: 'The answer engine hiccuped. Try again in a moment.',
      sources: [],
      usedMemories: [],
      error: String(err?.message || err),
    });
  }
};
