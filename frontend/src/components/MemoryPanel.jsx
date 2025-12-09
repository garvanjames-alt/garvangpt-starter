// frontend/src/components/MemoryPanel.jsx
import React, { useEffect, useState } from "react";

/**
 * Simple admin-only memory panel.
 * Expects backend cookie auth (gh_session) so all calls use credentials:'include'.
 *
 * API base:
 *  - Prefer VITE_API_BASE_URL if set (e.g. https://almosthuman-starter-staging.onrender.com)
 *  - Fallback to "" so relative /api/* works via Vite proxy in local dev.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function MemoryPanel() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMemories() {
    setLoading(true);
    setStatus("Loading memories...");
    try {
      const res = await fetch(`${API_BASE}/api/memory`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Load failed (${res.status})`);
      }

      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("Memories loaded.");
    } catch (e) {
      setStatus(`Load error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function addMemory() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setStatus("Adding memory...");
    try {
      const res = await fetch(`${API_BASE}/api/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Add failed (${res.status})`);
      }

      setText("");
      await loadMemories();
      setStatus("Memory added.");
    } catch (e) {
      setStatus(`Add error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function clearMemories() {
    if (!confirm("Clear ALL memories?")) return;

    setLoading(true);
    setStatus("Clearing memories...");
    try {
      const res = await fetch(`${API_BASE}/api/memory`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Clear failed (${res.status})`);
      }

      setItems([]);
      setStatus("Memories cleared.");
    } catch (e) {
      setStatus(`Clear error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Optional: auto-load on mount so you see state immediately
  useEffect(() => {
    loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>Admin Memories</h3>
        <div style={styles.btnRow}>
          <button onClick={loadMemories} disabled={loading} style={styles.btn}>
            Load memories
          </button>
          <button onClick={clearMemories} disabled={loading} style={styles.btnDanger}>
            Clear
          </button>
        </div>
      </div>

      <div style={styles.inputRow}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a memory..."
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && addMemory()}
          disabled={loading}
        />
        <button onClick={addMemory} disabled={loading || !text.trim()} style={styles.btn}>
          Add
        </button>
      </div>

      {status && <div style={styles.status}>{status}</div>}

      <div style={styles.list}>
        {items.length === 0 && (
          <div style={styles.empty}>No memories yet.</div>
        )}
        {items.map((it) => (
          <div key={it.id || it.ts} style={styles.item}>
            <div style={styles.itemText}>{it.text}</div>
            {it.ts && (
              <div style={styles.itemMeta}>
                {new Date(it.ts).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    marginTop: 16,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  btnRow: { display: "flex", gap: 8 },
  inputRow: { display: "flex", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
  },
  btn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnDanger: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,80,80,0.5)",
    background: "rgba(255,80,80,0.15)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  status: {
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 8,
  },
  list: {
    display: "grid",
    gap: 6,
    maxHeight: 220,
    overflow: "auto",
    paddingRight: 4,
  },
  item: {
    padding: "8px 10px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  itemText: { fontSize: 14, lineHeight: 1.3 },
  itemMeta: { fontSize: 11, opacity: 0.7, marginTop: 4 },
  empty: { fontSize: 13, opacity: 0.7, padding: 8 },
};
