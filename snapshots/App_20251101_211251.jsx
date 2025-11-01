import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  // --- Top question box ---
  const [q, setQ] = useState('');

  // --- Prototype box ---
  const [proto, setProto] = useState('');
  const [micReady, setMicReady] = useState(false);
  const recognitionRef = useRef(null);

  // --- Output ---
  const [answer, setAnswer] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speak, setSpeak] = useState(true);

  // --- Memories ---
  const [memInput, setMemInput] = useState('');
  const [mems, setMems] = useState([]);       // displayed slice (newest → oldest)
  const [memTotal, setMemTotal] = useState(0); // total items in store

  // Helpers
  async function askBackend(question) {
    const r = await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim() })
    });
    if (!r.ok) throw new Error('respond ' + r.status);
    const j = await r.json();
    return (j.reply ?? j.text ?? j.answer ?? '').trim();
  }

  async function speakAloud(text) {
    const t = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!t.ok) throw new Error('tts ' + t.status);
    const blob = await t.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }

  async function onAsk() {
    const question = q.trim();
    if (!question) return;
    setErr('');
    setIsLoading(true);
    try {
      const a = await askBackend(question);
      setAnswer(a);
      if (speak && a) await speakAloud(a);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setIsLoading(false);
    }
  }

  async function onSendProto() {
    const question = proto.trim();
    if (!question) return;
    setErr('');
    setIsLoading(true);
    try {
      const a = await askBackend(question);
      setAnswer(a);
      if (speak && a) await speakAloud(a);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setIsLoading(false);
    }
  }

  // --- Mic (Web Speech API) ---
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (evt) => {
      let text = '';
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        text += evt.results[i][0].transcript;
      }
      setProto(text);
    };
    rec.onend = () => { recognitionRef.current = null; };
    recognitionRef.current = rec;
    setMicReady(true);
  }, []);

  function onStartMic() {
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.start(); } catch {}
  }

  // --- Memories API (show latest 20, newest first) ---
  async function loadMemories() {
    let r = await fetch('/api/memory');
    if (!r.ok) r = await fetch('/memory');
    if (!r.ok) throw new Error('mem list ' + r.status);
    const j = await r.json();
    const all = Array.isArray(j.items) ? j.items : [];
    setMemTotal(all.length);
    const latest = all.slice(-20).reverse();
    setMems(latest);
  }

  async function addMemory() {
    const text = memInput.trim();
    if (!text) return;
    let r = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!r.ok) {
      r = await fetch('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
    }
    if (!r.ok) throw new Error('mem add ' + r.status);
    setMemInput('');
    await loadMemories(); // refresh so the new item appears at top
  }

  async function clearMemories() {
    let r = await fetch('/api/memory', { method: 'DELETE' });
    if (!r.ok) r = await fetch('/memory', { method: 'DELETE' });
    if (!r.ok) throw new Error('mem clear ' + r.status);
    await loadMemories();
  }

  // Share helpers
  const transcript = useMemo(() => {
    const lines = [];
    if (q.trim()) lines.push(`Q: ${q.trim()}`);
    if (proto.trim()) lines.push(`Q2: ${proto.trim()}`);
    if (answer.trim()) lines.push(`A: ${answer.trim()}`);
    return lines.join('\n');
  }, [q, proto, answer]);

  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(transcript || '');
      alert('Copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  }

  function downloadTranscript() {
    const blob = new Blob([transcript || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'garvangpt-transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: 16 }}>
      <h1>GarvanGPT — “Almost Human” (Local MVP)</h1>
      <p>Backend at <strong>3001</strong>; Frontend at <strong>5173</strong>. API base via Vite proxy.</p>

      {/* Question (dev-only) */}
      <h3>Question (dev-only)</h3>
      <textarea
        rows={3}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 8 }}
        placeholder="what is amoxicillin"
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onAsk} disabled={isLoading} style={{ padding: '8px 14px' }}>
          {isLoading ? 'Thinking…' : 'Ask'}
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={speak} onChange={e => setSpeak(e.target.checked)} /> Read aloud (ElevenLabs)
        </label>
      </div>

      {/* Prototype */}
      <h3>Talk to the prototype</h3>
      <textarea
        rows={3}
        value={proto}
        onChange={(e) => setProto(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 8 }}
        placeholder="Speak or type here…"
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
        <button onClick={onStartMic} disabled={!micReady} style={{ padding: '8px 12px' }}>Start mic</button>
        <button onClick={onSendProto} disabled={isLoading} style={{ padding: '8px 14px' }}>
          {isLoading ? 'Thinking…' : 'Send to prototype'}
        </button>
      </div>

      {/* Assistant */}
      <h3>Assistant</h3>
      <textarea
        readOnly
        rows={6}
        value={answer}
        style={{ width: '100%', padding: 12, marginBottom: 12 }}
        placeholder="The answer will appear here…"
      />
      {err && <div style={{ color: 'crimson', marginBottom: 16 }}>Error: {err}</div>}

      {/* Share */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <button onClick={copyTranscript}>Copy answer/transcript</button>
        <button onClick={downloadTranscript}>Download .txt</button>
      </div>

      {/* Memories */}
      <h3>Memories (count: {memTotal})</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={loadMemories}>Load</button>
        <button onClick={clearMemories}>Clear all</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={memInput}
          onChange={(e) => setMemInput(e.target.value)}
          placeholder="Add a new memory…"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={addMemory}>Add</button>
      </div>
      <ul style={{ paddingLeft: 18 }}>
        {mems.map((m, i) => (<li key={i}>{m}</li>))}
      </ul>
    </div>
  );
}
