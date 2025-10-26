// frontend/src/App.jsx
import React, { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://garvangpt-starter-1.onrender.com";

export default function App() {
  // health + memories
  const [health, setHealth] = useState("checking...");
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [memError, setMemError] = useState(null);

  // ask/response
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState(null);

  // load health
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/health`);
        const ok = r.ok ? "ok" : `bad (${r.status})`;
        if (!cancelled) setHealth(ok);
      } catch {
        if (!cancelled) setHealth("offline");
      }
    })();
    return () => (cancelled = true);
  }, []);

  // load memories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMemError(null);
        const r = await fetch(`${API_BASE}/memory`, { credentials: "omit" });
        if (!r.ok) throw new Error(`GET /memory failed: ${r.status}`);
        const data = await r.json();
        const arr = Array.isArray(data) ? data : data?.items || [];
        if (!cancelled) setItems(arr);
      } catch (e) {
        if (!cancelled) setMemError("Could not load memories.");
        console.error(e);
      }
    })();
    return () => (cancelled = true);
  }, []);

  async function add() {
    const t = text.trim();
    if (!t) return;
    try {
      setMemError(null);
      const r = await fetch(`${API_BASE}/memory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t }),
        credentials: "omit",
      });
      if (!r.ok) throw new Error(`POST /memory failed: ${r.status}`);
      setText("");
      // reload
      const g = await fetch(`${API_BASE}/memory`);
      setItems(await g.json());
    } catch (e) {
      setMemError("Failed to add memory.");
      console.error(e);
    }
  }

  async function clearAll() {
    try {
      setMemError(null);
      const r = await fetch(`${API_BASE}/memory`, {
        method: "DELETE",
        credentials: "omit",
      });
      if (!r.ok) throw new Error(`DELETE /memory failed: ${r.status}`);
      setItems([]);
    } catch (e) {
      setMemError("Failed to clear memories.");
      console.error(e);
    }
  }

  async function ask() {
    const q = prompt.trim();
    if (!q) return;
    setAskBusy(true);
    setAskError(null);
    setAnswer("");
    try {
      const r = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      if (!r.ok) throw new Error(`POST /ask failed: ${r.status}`);
      const data = await r.json();
      setAnswer(data.answer || "(no answer)");
    } catch (e) {
      setAskError("Ask failed.");
      console.error(e);
    } finally {
      setAskBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: 16, lineHeight: 1.4 }}>
      <h1>GarvanGPT — Almost Human</h1>

      <p>
        Frontend is alive ✅
        <br />
        <strong>Backend /health:</strong> {health}
      </p>

      <hr />

      {/* Ask/Respond */}
      <section>
        <h2>Ask</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ flex: 1, padding: 8 }}
            placeholder="Ask me anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button onClick={ask} disabled={askBusy}>
            {askBusy ? "Asking..." : "Ask"}
          </button>
        </div>
        {askError && <p style={{ color: "crimson" }}>{askError}</p>}
        {answer && (
          <pre
            style={{
              background: "#fafafa",
              border: "1px solid #eee",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap",
            }}
          >
            {answer}
          </pre>
        )}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* Memory demo */}
      <section>
        <h2>Memory</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ flex: 1, padding: 8 }}
            placeholder="Add a memory..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={add}>Add</button>
          <button onClick={clearAll}>Clear</button>
        </div>

        {memError && <p style={{ color: "crimson" }}>{memError}</p>}

        <strong>Items: {items.length}</strong>
        <pre
          style={{
            background: "#fafafa",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 6,
            minHeight: 56,
            marginTop: 10,
          }}
        >
          {JSON.stringify(items, null, 2)}
        </pre>

        <p style={{ marginTop: 20 }}>
          If you can read this, React mounted correctly and the white screen is
          defeated.
        </p>
      </section>
    </div>
  );
}
