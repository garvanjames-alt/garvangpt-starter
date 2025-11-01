// frontend/src/VoiceChat.jsx
import React, { useState } from 'react';

export default function VoiceChat() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [err, setErr] = useState('');

  async function onAsk() {
    alert('VERSION 3'); // confirm this code is running
    setErr('');
    try {
      const r = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim() })   // <-- send {question}
      });
      if (!r.ok) throw new Error('respond ' + r.status);
      const j = await r.json();
      const a = (j.reply ?? j.text ?? j.answer ?? '').trim();
      setAnswer(a || '(no answer)');
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: 16 }}>
      <h1>GarvanGPT — Minimal Ask Test</h1>

      <label style={{ display: 'block', marginBottom: 8 }}>Question (dev-only)</label>
      <textarea
        rows={3}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 8 }}
        placeholder="what is amoxicillin"
      />

      <button onClick={onAsk} style={{ padding: '8px 14px' }}>Ask</button>

      {err && <div style={{ marginTop: 12, color: 'crimson' }}>Error: {err}</div>}

      <div style={{ marginTop: 20 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Assistant</label>
        <textarea
          readOnly
          rows={6}
          value={answer}
          style={{ width: '100%', padding: 12 }}
          placeholder="The answer will appear here…"
        />
      </div>
    </div>
  );
}
