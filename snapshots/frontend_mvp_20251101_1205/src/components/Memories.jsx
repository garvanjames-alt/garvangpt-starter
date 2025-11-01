// frontend/src/components/Memories.jsx
import React, { useEffect, useState } from "react";
import { API_BASE, getMemories, addMemory, clearMemories } from "../lib/api";

export default function Memories() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [note, setNote] = useState(null);   // success/error message

  function flash(msg, type = "ok") {
    setNote({ msg, type });
    setTimeout(() => setNote(null), 2500);
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await getMemories();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      flash(`Failed to load memories: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onAdd() {
    if (!input.trim()) return;
    setAdding(true);
    try {
      await addMemory(input.trim());
      setInput("");
      await refresh();
      flash("Saved.");
    } catch (err) {
      flash(`Save failed: ${err.message}`, "err");
    } finally {
      setAdding(false);
    }
  }

  async function onClear() {
    if (!items.length) return;
    setClearing(true);
    try {
      await clearMemories();
      await refresh();
      flash("Cleared.");
    } catch (err) {
      flash(`Clear failed: ${err.message}`, "err");
    } finally {
      setClearing(false);
    }
  }

  return (
    <section style={{ marginTop: 8 }}>
      <h2>Memories</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <input
          placeholder="Add a memory…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={adding || clearing}
          style={{ flex: 1, padding: "8px 10px" }}
        />
        <button onClick={onAdd} disabled={adding || clearing || !input.trim()}>
          {adding ? "Saving…" : "Add"}
        </button>
        <button onClick={onClear} disabled={clearing || adding || !items.length}>
          {clearing ? "Clearing…" : "Clear"}
        </button>
      </div>

      {note && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: note.type === "err" ? "#a00" : "#0a0",
          }}
        >
          {note.msg}
        </div>
      )}

      <div style={{ marginTop: 14, minHeight: 24 }}>
        {loading ? (
          <div>Loading memories…</div>
        ) : items.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {items.map((m, i) => (
              <li key={`${m.ts || i}-${m.text}`}>
                <span style={{ color: "#666" }}>
                  {m.ts ? new Date(m.ts).toLocaleString() + " " : ""}
                </span>
                {m.text}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: "#666" }}>• No memories yet.</div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#777" }}>
        API: {API_BASE}
      </div>
    </section>
  );
}
