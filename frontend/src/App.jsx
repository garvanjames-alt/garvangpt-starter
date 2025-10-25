import React, { useState, useEffect } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [mem, setMem] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch memory list
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/memory');
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);
        const data = await res.json();
        setMem(Array.isArray(data?.items) ? data.items : []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Could not load memories.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Add new memory
  async function onAdd(e) {
    e.preventDefault();
    const payload = text.trim();
    if (!payload) return;

    try {
      const res = await fetch('http://localhost:3001/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: payload }),
      });
      const data = await res.json();

      if (Array.isArray(data?.items)) setMem(data.items);
      else if (data?.item) setMem(prev => [...prev, data.item]);

      setText('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to add memory.');
    }
  }

  // Clear all memories
  async function onClear() {
    try {
      const res = await fetch('http://localhost:3001/api/memory', { method: 'DELETE' });
      if (!res.ok) throw new Error('DELETE /api/memory failed');
      setMem([]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to clear memories.');
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>GarvanGPT — Almost Human</h1>
      <p>Frontend is alive ✅</p>
      <p><strong>Backend /health:</strong> <code>ok</code></p>
      <hr style={{ margin: '1.5rem 0' }} />

      {loading && <p style={{ color: '#666' }}>Loading memories…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2 style={{ marginTop: 0 }}>Memory</h2>
      <form onSubmit={onAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a memory..."
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button type="submit">Add</button>
        <button type="button" onClick={onClear}>Clear</button>
      </form>

      <p><strong>Items:</strong> {mem.length}</p>
      <pre style={{ background: '#fafafa', padding: '1rem', borderRadius: '8px' }}>
        {JSON.stringify(mem, null, 2)}
      </pre>

      <p>If you can read this, React mounted correctly and the white screen is defeated.</p>
    </div>
  );
}
