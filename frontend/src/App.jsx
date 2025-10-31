import React, { useEffect, useMemo, useState } from 'react';

export default function App() {
  const [question, setQuestion] = useState('Using the clinic docs, what should a new patient bring?');
  const [memories, setMemories] = useState([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- Memory API helpers ----
  async function listMemories() {
    setError('');
    try {
      const r = await fetch('/api/memory');
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
        body: JSON.stringify({ text })
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

  useEffect(() => { listMemories(); }, []);
  const memCount = useMemo(() => memories.length, [memories]);

  // ---- UI ----
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-6">GarvanGPT — Clinic Docs</h1>

      <section className="mb-10">
        <label className="block font-semibold mb-2">Question</label>
        <textarea
          className="w-full h-40 rounded border p-3"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex gap-3 mt-4 items-center">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => alert('Hook this to /respond next')}
          >
            Ask
          </button>
          <button className="px-4 py-2 rounded border" onClick={() => setQuestion('')}>
            Clear
          </button>
          <span className="text-sm text-gray-500">Tip: Cmd/Ctrl + Enter</span>
        </div>
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
            onKeyDown={(e) => { if (e.key === 'Enter') addMemory(newMemoryText); }}
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
