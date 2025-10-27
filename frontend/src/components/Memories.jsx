// frontend/src/components/Memories.jsx
import React, { useEffect, useState } from 'react';
import { addMemory, clearMemories, listMemories } from '../lib/api';

export default function Memories() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setError('');
      const res = await listMemories();
      setItems(res.items ?? []);
    } catch (e) {
      setError(e?.message || 'Failed to load memories');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAdd() {
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await addMemory(text.trim());
      setText('');
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to add memory');
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    setError('');
    try {
      await clearMemories();
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to clear memories');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Memories</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
        <input
          aria-label="Add a memory…"
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={onAdd} disabled={busy}>Add</button>
        <button onClick={onClear} disabled={busy}>Clear</button>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      <ul>
        {items.length === 0 ? (
          <li style={{ opacity: 0.7 }}>No memories yet.</li>
        ) : (
          items.map((m, i) => (
            <li key={m.id ?? i}>
              <span style={{ opacity: 0.6, marginRight: 6 }}>
                {m.ts ? new Date(m.ts).toLocaleString() : ''}
              </span>
              {m.text ?? String(m)}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
