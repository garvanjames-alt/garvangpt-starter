import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from "./components/ChatHeader";
import AgentStage from "./components/AgentStage";
import MessagePreview from "./components/MessagePreview";

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
  const [mems, setMems] = useState([]);        // displayed slice (newest → oldest)
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
    <>
      {/* Header and big agent stage */}
      <ChatHeader />
      <AgentStage
        listening={micReady}
        speaking={isLoading || (!!answer && speak)}
      />

      {/* Preview a couple of bubbles so you can see the avatar-in-bubble */}
      <MessagePreview />

      {/* --- Developer console, hidden in production later --- */}
      <div className="max-w-[900px] mx-auto p-4 md:p-6 border-t border-zinc-800 mt-6">
        <h1 className="text-2xl font-bold mb-2">GarvanGPT — “Almost Human” (Local MVP)</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Backend at <strong>3001</strong>; Frontend at <strong>5173</strong>. API base via Vite proxy.
        </p>

        {/* Question (dev-only) */}
        <h3 className="font-semibold mb-2">Question (dev-only)</h3>
        <textarea
          rows={3}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full p-3 mb-2 rounded-lg bg-zinc-900 border border-zinc-800"
          placeholder="what is amoxicillin"
        />
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onAsk} disabled={isLoading} className="px-4 py-2 rounded-lg bg-blue-600 disabled:opacity-50">
            {isLoading ? 'Thinking…' : 'Ask'}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={speak} onChange={e => setSpeak(e.target.checked)} /> Read aloud (ElevenLabs)
          </label>
        </div>

        {/* Prototype */}
        <h3 className="font-semibold mb-2">Talk to the prototype</h3>
        <textarea
          rows={3}
          value={proto}
          onChange={(e) => setProto(e.target.value)}
          className="w-full p-3 mb-2 rounded-lg bg-zinc-900 border border-zinc-800"
          placeholder="Speak or type here…"
        />
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onStartMic} disabled={!micReady} className="px-3 py-2 rounded-lg bg-zinc-800 disabled:opacity-50">Start mic</button>
          <button onClick={onSendProto} disabled={isLoading} className="px-4 py-2 rounded-lg bg-blue-600 disabled:opacity-50">
            {isLoading ? 'Thinking…' : 'Send to prototype'}
          </button>
        </div>

        {/* Assistant */}
        <h3 className="font-semibold mb-2">Assistant</h3>
        <textarea
          readOnly
          rows={6}
          value={answer}
          className="w-full p-3 mb-3 rounded-lg bg-zinc-900 border border-zinc-800"
          placeholder="The answer will appear here…"
        />
        {err && <div className="text-red-400 mb-4">Error: {err}</div>}

        {/* Share */}
        <div className="flex gap-3 mb-7">
          <button onClick={copyTranscript} className="px-3 py-2 rounded-lg bg-zinc-800">Copy answer/transcript</button>
          <button onClick={downloadTranscript} className="px-3 py-2 rounded-lg bg-zinc-800">Download .txt</button>
        </div>

        {/* Memories */}
        <h3 className="font-semibold mb-2">Memories (count: {memTotal})</h3>
        <div className="flex gap-3 mb-3">
          <button onClick={loadMemories} className="px-3 py-2 rounded-lg bg-zinc-800">Load</button>
          <button onClick={clearMemories} className="px-3 py-2 rounded-lg bg-zinc-800">Clear all</button>
        </div>
        <div className="flex gap-3 mb-3">
          <input
            value={memInput}
            onChange={(e) => setMemInput(e.target.value)}
            placeholder="Add a new memory…"
            className="flex-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800"
          />
          <button onClick={addMemory} className="px-3 py-2 rounded-lg bg-blue-600">Add</button>
        </div>
        <ul className="list-disc pl-6 space-y-1 text-zinc-300">
          {mems.map((m, i) => (<li key={i}>{m}</li>))}
        </ul>
      </div>
    </>
  );
}
