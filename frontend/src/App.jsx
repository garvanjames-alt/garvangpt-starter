import React from "react";
import { useEffect, useState } from "react";

const API_BASE = "https://garvangpt-starter-1.onrender.com"; // <-- hardcoded backend URL

export default function App() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [health, setHealth] = useState("checking…");

  // Load memories
  async function load() {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/memory`, { credentials: "omit" });
      if (!res.ok) throw new Error(`GET /memory failed: ${res.status}`);
      const data = await res.json();
      // data can be [] or {count, items}; normalize to an array for display
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      setItems(normalized);
    } catch (e) {
      setError("Could not load memories.");
      console.error(e);
    }
  }

  // Health check
  async function ping() {
    try {
      const res = await fetch(`${API_BASE}/health`, { credentials: "omit" });
      setHealth(res.ok ? "ok" : `bad (${res.status})`);
    } catch {
      setHealth("bad (network)");
    }
  }

  useEffect(() => {
    ping();
    load();
  }, []);

  async function add() {
    if (!text.trim()) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`POST /memory failed: ${res.status}`);
      setText("");
      await load();
    } catch (e) {
      setError("Failed to add memory.");
      console.error(e);
    }
  }

  async function clearAll() {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/memory`, {
        method: "DELETE",
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`DELETE /memory failed: ${res.status}`);
      await load();
    } catch (e) {
      setError("Failed to clear memories.");
      console.error(e);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "40px auto", padding: "0 16px" }}>
      <h1>GarvanGPT — Almost Human</h1>

      <p>
        Frontend is alive ✅
        <br />
        <strong>Backend /health:</strong> {health}
      </p>

      <hr />

      {error && (
        <p style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}

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
        If you can read this, React mounted correctly and the white screen is defeated.
      </p>
    </div>
  );
}
