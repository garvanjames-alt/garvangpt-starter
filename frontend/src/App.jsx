// frontend/src/App.jsx

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() || "http://localhost:3001";

function makeSessionId() {
  // simple, readable session id
  return "web-" + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  // --- session ---
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("sessionId") || makeSessionId();
  });
  const [sessionName, setSessionName] = useState(
    localStorage.getItem("sessionName") || ""
  );

  useEffect(() => {
    localStorage.setItem("sessionId", sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem("sessionName", sessionName);
  }, [sessionName]);

  // --- ui state ---
  const [apiOK, setApiOK] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const apiDisplay = useMemo(() => API_BASE.replace(/\/+$/, ""), []);

  // --- helpers ---
  async function healthCheck() {
    try {
      const r = await fetch(`${API_BASE}/health`);
      const j = await r.json();
      setApiOK(Boolean(j?.ok));
    } catch {
      setApiOK(false);
    }
  }

  async function refreshMemoryCount() {
    try {
      const r = await fetch(`${API_BASE}/memory/status`, {
        headers: { "X-Session-ID": sessionId },
      });
      const j = await r.json();
      if (typeof j?.count === "number") setMemoryCount(j.count);
    } catch {
      // ignore
    }
  }

  // initial checks
  useEffect(() => {
    healthCheck();
  }, []);

  useEffect(() => {
    // when session changes, refresh count
    refreshMemoryCount();
  }, [sessionId]);

  async function handleAsk() {
    const q = input.trim();
    if (!q) return;
    setInput("");

    // show the user question immediately
    setMessages((m) => [...m, { role: "user", content: q }]);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const answer =
        data?.answer?.toString().trim() || "⚠️ Error fetching response.";

      // show assistant message
      setMessages((m) => [...m, { role: "assistant", content: answer }]);

      // save to memory for this session
      try {
        await fetch(`${API_BASE}/memory/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId,
          },
          body: JSON.stringify({ type: "answer", text: answer }),
        });
      } catch (e) {
        console.warn("memory/save failed:", e);
      }

      // refresh count badge
      refreshMemoryCount();
    } catch (err) {
      console.error("ASK error:", err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Error fetching response." },
      ]);
    }
  }

  function resetSession() {
    const next = makeSessionId();
    setSessionId(next);
    setMessages([]);
    setMemoryCount(0);
  }

  function saveName() {
    setSessionName(sessionName.trim());
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>
        GarvanGPT — Pharmacist
      </h1>

      <div style={{ marginBottom: 12, color: "#444" }}>
        Status:{" "}
        <strong style={{ color: apiOK ? "green" : "crimson" }}>
          {apiOK ? "backend OK" : "backend DOWN"}
        </strong>{" "}
        • Session: <code>{sessionId}</code> • API at{" "}
        <code>{apiDisplay}</code>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="e.g., What are the main side effects of Efexor XL?"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />
        <button
          onClick={handleAsk}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#eef3ff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Ask
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600, minWidth: 90 }}>Session name:</div>
        <input
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="e.g., Postman Pat"
          style={{
            width: 220,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={saveName}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Save name
        </button>
        <button
          onClick={healthCheck}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Health check
        </button>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>API:</span>
          <span
            style={{
              fontWeight: 700,
              color: apiOK ? "green" : "crimson",
              minWidth: 28,
              display: "inline-block",
            }}
          >
            {apiOK ? "OK" : "DOWN"}
          </span>
        </div>
        <button
          onClick={resetSession}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Reset session
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>Memory:</div>
        <button
          onClick={refreshMemoryCount}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Refresh count
        </button>
        <div>(items: {memoryCount})</div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          borderTop: "1px solid #eee",
          paddingTop: 12,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{}}>
            <div
              style={{
                fontWeight: 700,
                background: m.role === "user" ? "#e9f0ff" : "#eaffe9",
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              {m.role}
            </div>
            <div
              style={{
                background: m.role === "user" ? "#f3f7ff" : "#f3fff3",
                border: "1px solid #e4e4e4",
                borderRadius: 8,
                padding: "10px 12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
