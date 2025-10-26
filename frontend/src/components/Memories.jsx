// frontend/src/components/Memories.jsx
import React from "react";
import { listMemories, addMemory, clearMemories } from "../api.js";

export default function Memories() {
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  async function refresh() {
    try {
      setLoading(true);
      const data = await listMemories();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setToast({ kind: "err", msg: err.message || "Failed to load memories" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setLoading(true);
      await addMemory(text.trim());
      setText("");
      await refresh();
      setToast({ kind: "ok", msg: "Saved." });
    } catch (err) {
      setToast({ kind: "err", msg: err.message || "Save failed" });
    } finally {
      setLoading(false);
    }
  }

  async function onClear() {
    try {
      setLoading(true);
      await clearMemories();
      await refresh();
      setToast({ kind: "ok", msg: "Cleared." });
    } catch (err) {
      setToast({ kind: "err", msg: err.message || "Clear failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="controls" style={{ margin: "8px 0 16px" }}>
        <form onSubmit={onAdd} style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            type="text"
            placeholder="Add a memory…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button className="primary" disabled={loading || !text.trim()}>
            Add
          </button>
          <button type="button" onClick={onClear} disabled={loading || items.length === 0}>
            Clear
          </button>
        </form>
      </div>

      <ul className="memories">
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m, i) => (
            <li key={m.id || i}>
              {m.text}
              <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
                {/* show timestamp if present */}
                {m.ts ? `(${new Date(m.ts).toLocaleDateString()}, ${new Date(m.ts).toLocaleTimeString()})` : null}
              </span>
            </li>
          ))
        )}
      </ul>

      {/* tiny toast */}
      {toast ? (
        <div className={`toast${toast.kind === "err" ? " --err" : ""}`} role="status" aria-live="polite">
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
