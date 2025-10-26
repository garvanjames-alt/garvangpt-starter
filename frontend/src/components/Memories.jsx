import React, { useEffect, useState } from 'react';

/**
 * Memories.jsx
 * - Lists memories from the backend
 * - Lets you add a new memory
 * - Lets you clear all memories
 * - Shows a small toast on success/failure
 */
export default function Memories() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // toast: { text: string, kind: 'ok' | 'err' }
  const [notice, setNotice] = useState({ text: '', kind: 'ok' });

  // Load on mount
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const res = await fetch('/api/memory', { method: 'GET' });
      if (!res.ok) throw new Error(`GET /api/memory failed: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load memories', 'err');
    }
  }

  function showToast(msg, kind = 'ok', ms = 1800) {
    setNotice({ text: msg, kind });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setNotice({ text: '', kind: 'ok' }), ms);
  }

  async function onAdd(e) {
    e.preventDefault();
    if (busy) return;
    const value = text.trim();
    if (!value) return;

    setBusy(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value })
      });
      if (!res.ok) throw new Error(`POST /api/memory failed: ${res.status}`);
      setText('');
      await refresh();
      showToast('Saved ✓', 'ok', 1800);
    } catch (err) {
      console.error(err);
      showToast('Failed to save', 'err', 2200);
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/memory', { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE /api/memory failed: ${res.status}`);
      setItems([]);
      showToast('Cleared ✓', 'ok', 1400);
    } catch (err) {
      console.error(err);
      showToast('Failed to clear', 'err', 2200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {/* Controls */}
      <div className="controls">
        <label htmlFor="mem-input" className="muted" style={{ fontWeight: 600 }}>
          Add a memory
        </label>

        <input
          id="mem-input"
          type="text"
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          aria-label="Memory text"
        />

        <button className="button primary" onClick={onAdd} disabled={busy || !text.trim()}>
          {busy ? 'Saving…' : 'Add'}
        </button>

        <button onClick={onClear} disabled={busy || items.length === 0}>
          Clear
        </button>
      </div>

      {/* List */}
      <ul className="memories" style={{ marginTop: 20 }}>
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m, i) => (
            <li key={i}>
              <span style={{ display: 'inline-block', marginRight: 8 }}>•</span>
              <span>{m.text}</span>
              {m.ts ? (
                <span className="muted" style={{ marginLeft: 8 }}>
                  ({new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString()})
                </span>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {/* Toast */}
      {notice.text ? (
        <div className={`toast ${notice.kind === 'err' ? 'toast--err' : ''}`}>{notice.text}</div>
      ) : null}
    </div>
  );
}
