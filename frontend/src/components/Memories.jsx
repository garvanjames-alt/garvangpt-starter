// frontend/src/components/Memories.jsx
import React from "react";
import { API_BASE } from "../api.js";

export default function Memories() {
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/memory`, { method: "GET" });
      if (!res.ok) throw new Error(`GET /memory ${res.status}`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        throw new Error("Bad response shape from /memory");
      }
    } catch (e) {
      console.error(e);
      setErr("request_failed");
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function onAdd(e) {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t || saving) return;

    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(`POST /memory ${res.status}`);
      // Optional: read the created item
      await res.json().catch(() => ({}));
      setText("");
      await load(); // <— IMPORTANT: refresh using API_BASE
    } catch (e) {
      console.error(e);
      setErr("request_failed");
    } finally {
      setSaving(false);
    }
  }

  async function onClear() {
    if (clearing) return;
    setClearing(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/memory`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /memory ${res.status}`);
      await res.json().catch(() => ({}));
      await load(); // refresh list
    } catch (e) {
      console.error(e);
      setErr("request_failed");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      <h2>Memories</h2>

      <form
        onSubmit={onAdd}
        style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}
      >
        <input
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <button
          type="submit"
          disabled={!text.trim() || saving}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {saving ? "Saving…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={clearing}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {clearing ? "Clearing…" : "Clear"}
        </button>
      </form>

      {err === "request_failed" ? (
        <div className="toast toast--err">request_failed</div>
      ) : null}

      <ul style={{ paddingLeft: 20 }}>
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <span style={{ opacity: 0.7, marginRight: 8 }}>
                {new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString()}
              </span>
              <span>{m.text}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
