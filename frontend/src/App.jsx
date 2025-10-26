import React, { useEffect, useState } from "react";

// Where the frontend calls the backend.
// In Render, we set VITE_API_BASE to your backend URL.
// Locally it falls back to http://localhost:3001.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function App() {
  // ----- Memory state -----
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [memError, setMemError] = useState(null);

  // ----- Health state -----
  const [health, setHealth] = useState("checking…");

  // ----- Ask state -----
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [askError, setAskError] = useState(null);

  // ----- Load memories -----
  async function loadMemories() {
    setMemError(null);
    try {
      const res = await fetch(`${API_BASE}/memory`, { credentials: "omit" });
      if (!res.ok) throw new Error(`GET /memory failed: ${res.status}`);
      const data = await res.json();

      // Normalize: backend may return [] or { items: [...] }
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];

      setItems(normalized);
    } catch (e) {
      console.error(e);
      setMemError("Could not load memories.");
      setItems([]);
    }
  }

  // ----- Add a memory -----
  async function addMemory() {
    if (!text.trim()) return;
    setMemError(null);
    try {
      const res = await fetch(`${API_BASE}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`POST /memory failed: ${res.status}`);
      setText("");
      await loadMemories();
    } catch (e) {
      console.error(e);
      setMemError("Failed to add memory.");
    }
  }

  // ----- Clear all memories -----
  async function clearAll() {
    setMemError(null);
    try {
      const res = await fetch(`${API_BASE}/memory`, {
        method: "DELETE",
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`DELETE /memory failed: ${res.status}`);
      await loadMemories();
    } catch (e) {
      console.error(e);
      setMemError("Failed to clear memories.");
    }
  }

  // ----- Ask endpoint -----
  async function doAsk() {
    setAskError(null);
    setAnswer(null);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        // Important: backend expects { question }
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`POST /ask failed: ${res.status} ${msg}`);
      }
      const data = await res.json();
      setAnswer(data.answer ?? JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(e);
      setAskError("Ask failed.");
    }
  }

  // ----- Health check -----
  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { credentials: "omit" });
      setHealth(res.ok ? "ok" : `error: ${res.status}`);
    } catch {
      setHealth("error");
    }
  }

  // ----- Initial load -----
  useEffect(() => {
    checkHealth();
    loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px" }}>
      <h1>
        GarvanGPT — <span style={{ fontWeight: 500 }}>Almost Human</span>
      </h1>

      <p style={{ marginTop: 12 }}>
        Frontend is alive{" "}
        <span role="img" aria-label="ok">
          ✅
        </span>
        <br />
        <strong>Backend /health:</strong> {health}
      </p>

      <hr style={{ margin: "16px 0" }} />

      {/* Ask */}
      <h2>Ask</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="Ask me anything..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={doAsk}>Ask</button>
      </div>
      {askError && (
        <div style={{ color: "crimson", marginBottom: 12 }}>Ask failed.</div>
      )}
      {answer && (
        <pre
          style={{
            background: "#fafafa",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 6,
            minHeight: 56,
            marginTop: 8,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {typeof answer === "string" ? answer : JSON.stringify(answer, null, 2)}
        </pre>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* Memory */}
      <h2>Memory</h2>
      {memError && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          {memError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="Add a memory..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={addMemory}>Add</button>
        <button onClick={clearAll}>Clear</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <strong>Items: {items.length}</strong>
      </div>

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
    </div>
  );
}
