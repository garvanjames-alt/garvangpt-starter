// backend/respondHandler.cjs
const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(process.cwd(), 'backend', 'memory.jsonl');

function readRecentMemories(max = 20) {
  try {
    const text = fs.readFileSync(MEMORY_FILE, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    const last = lines.slice(-max).map(l => { try { return JSON.parse(l); } catch { return null; }})
      .filter(Boolean).map(x => x.text).filter(Boolean);
    return last;
  } catch { return []; }
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return `You asked: ${prompt}`; // fallback keeps UI working

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are GarvanGPT, a helpful pharmacist educator. Answer clearly and concisely for a layperson; add brief cautions if safety is relevant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 400
    })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(()=> '');
    throw new Error(`OpenAI error ${resp.status}: ${t.slice(0,200)}`);
  }
  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content || '').trim() || 'Sorry, I could not generate an answer.';
}

async function respond(question) {
  const recent = readRecentMemories(10);
  const context = recent.length ? `\n\nRecent user memories:\n- ${recent.join('\n- ')}` : '';
  const prompt = `Question: ${question}${context}\n\nAnswer in 3–6 sentences.`;
  return await callOpenAI(prompt);
}

module.exports = { respond };
