import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  // ---------- UI state ----------
  const [question, setQuestion] = useState(
    'Using the clinic docs, what should a new patient bring?'
  );
  const [memories, setMemories] = useState([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------- Microphone (Web Speech API) ----------
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const recogRef = useRef(null);

  // Create recognition instance lazily (Chrome: webkitSpeechRecognition)
  function ensureRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (recogRef.current) return recogRef.current;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (evt) => {
      let finalText = '';
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const chunk = evt.results[i][0].transcript;
        finalText += chunk;
      }
      // Append live transcript into the question box
      setQuestion((prev) => {
        // If user hasn’t typed, just use transcript. If they have, append.
        return prev && prev.trim().length > 0 ? `${prev} ${finalText}` : finalText;
      });
    };
    r.onerror = (e) => {
      setMicError(e.error || 'mic error');
      setIsRecording(false);
    };
    r.onend = () => {
      setIsRecording(false);
    };
    recogRef.current = r;
    return r;
  }

  const startMic = async () => {
    setMicError('');
    try {
      // Must be over HTTPS (Netlify is fine) and user gesture
      const r = ensureRecognizer();
      if (!r) {
        setMicError('This browser does not support speech recognition.');
        return;
      }
      r.start();
      setIsRecording(true);
    } catch (e) {
      setMicError(e?.message || String(e));
      setIsRecording(false);
    }
  };

  const stopMic = () => {
    try {
      recogRef.current?.stop();
    } catch {
      /* noop */
    } finally {
      setIsRecording(false);
    }
  };

  // ---------- Memory API helpers ----------
  async function listMemories() {
    setError('');
    try {
      const r = await fetch('/api/memory'); // Netlify _redirects proxies this to Render
      if (!r.ok) throw new Error(`list failed: ${r.status}`);
      const { items } = await r.json();
      setMemories(Array.isArray(items) ? items : []);
    } catch (e) {
      setError(e.message || String(e));
      setMemories([]);
    }
  }

  async function addMemory(text) {
    if (!text?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`add failed: ${r.status}`);
      await listMemories();
      setNewMemoryText('');
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function clearMemory() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/memory', { method: 'DELETE' });
      if (!r.ok) throw new Error(`clear failed: ${r.status}`);
      await listMemories();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listMemories();
  }, []);

  const memCount = useMemo(() => memories.length, [memories]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-6">GarvanGPT — Clinic Docs</h1>

      <section className="mb-6">
        <label className="block font-semibold mb-2">Question</label>
        <textarea
          className="w-full h-40 rounded border p-3"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => alert('Hook this to /respond next')}
          >
            Ask
          </button>
          <button className="px-4 py-2 rounded border" onClick={() => setQuestion('')}>
            Clear
          </button>

          {/* Mic controls */}
          {!isRecording ? (
            <button
              className="px-4 py-2 rounded border"
              onClick={startMic}
              title="Start microphone (speech to text)"
            >
              🎤 Start mic
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded border"
              onClick={stopMic}
              title="Stop microphone"
            >
              ⏹ Stop mic
            </button>
          )}
          <span className="text-sm text-gray-500">Tip: Cmd/Ctrl + Enter</span>
        </div>
        {micError && <div className="mt-2 text-red-600">Mic error: {micError}</div>}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            Memories <span className="text-gray-500">({memCount})</span>
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border" onClick={listMemories} disabled={loading}>
              Refresh
            </button>
            <button
              className="px-3 py-1 rounded border"
              onClick={clearMemory}
              disabled={loading || memCount === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 rounded border p-2"
            placeholder="Add a memory…"
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMemory(newMemoryText);
            }}
          />
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => addMemory(newMemoryText)}
            disabled={loading}
          >
            Add
          </button>
        </div>

        {error && <div className="mb-3 text-red-600">Error: {error}</div>}

        <ul className="space-y-2">
          {memories.map((m) => (
            <li key={m.id} className="p-3 rounded border">
              <div className="text-xs text-gray-500 mb-1">{m.createdAt || ''}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </li>
          ))}
          {memories.length === 0 && <li className="text-gray-500">No memories yet.</li>}
        </ul>
      </section>
    </div>
  );
}
