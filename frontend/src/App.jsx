import React, { useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:3001";

// --- tiny typewriter helper (returns a cancel function) ---
function typeInto(fullText, { chunkSize = 3, intervalMs = 18, onChunk, onDone }) {
  let i = 0;
  const id = setInterval(() => {
    const next = fullText.slice(i, i + chunkSize);
    if (next.length === 0) {
      clearInterval(id);
      onDone?.();
      return;
    }
    onChunk(next);
    i += chunkSize;
  }, intervalMs);
  return () => clearInterval(id);
}

export default function App() {
  // UI state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [apiOK, setApiOK] = useState(false);
  const [memCount, setMemCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // session + refs
  const [currentName, setCurrentName] = useState("");
  const sessionIdRef = useRef("");
  const cancelTypeRef = useRef(null);
  const endRef = useRef(null);

  // on first load: create a session id & do a health check
  useEffect(() => {
    const saved = localStorage.getItem("sessionId");
    sessionIdRef.current = saved || `web-${Math.random().toString(36).slice(2, 9)}`;
    if (!saved) localStorage.setItem("sessionId", sessionIdRef.current);
    checkHealth();
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function checkHealth() {
    try {
      const sid = sessionIdRef.current || "default";
      const [hRes, mRes] = await Promise.allSettled([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/memory/status`, { headers: { "X-Session-ID": sid } }),
      ]);

      const apiOk = hRes.status === "fulfilled" && (await hRes.value.json()).body === "ok";
      setApiOK(apiOk);

      if (mRes.status === "fulfilled") {
        const m = await mRes.value.json().catch(() => ({}));
        setMemCount(typeof m.count === "number" ? m.count : 0);
      }
    } catch {
      setApiOK(false);
    }
  }

  async function handleAsk() {
    const q = input.trim();
    if (!q) return;
    setInput("");

    const userMsg = { role: "user", content: q };
    const assistantMsg = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    setIsTyping(true);

    try {
      // Ask backend
      const r = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionIdRef.current || "default",
        },
        body: JSON.stringify({ question: q }),
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const fullAnswer = data.answer ?? String(data.body ?? "");

      // stream into the UI (typewriter)
      cancelTypeRef.current?.();
      cancelTypeRef.current = typeInto(fullAnswer, {
        chunkSize: 3,
        intervalMs: 18,
        onChunk: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + chunk };
            return copy;
          });
        },
        onDone: async () => {
          setIsTyping(false);
          cancelTypeRef.current = null;
          // save to memory
          await fetch(`${API_BASE}/memory/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-ID": sessionIdRef.current || "default",
            },
            body: JSON.stringify({ type: "answer", text: fullAnswer }),
          }).catch(() => {});
          // refresh the count
          refreshCount();
        },
      });
    } catch (e) {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error fetching response." }]);
      console.error(e);
    }
  }

  async function refreshCount() {
    try {
      const r = await fetch(`${API_BASE}/memory/status`, {
        headers: { "X-Session-ID": sessionIdRef.current || "default" },
      });
      const data = await r.json().catch(() => ({}));
      setMemCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      // keep current count
    }
  }

  function resetSession() {
    // new session id (simple client-side reset)
    sessionIdRef.current = `web-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("sessionId", sessionIdRef.current);
    setMessages([]);
    setMemCount(0);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 20, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 38, marginBottom: 10 }}>GarvanGPT — Pharmacist</h1>

      <p style={{ color: "#555", marginTop: 0 }}>
        Status: <strong style={{ color: apiOK ? "green" : "crimson" }}>{apiOK ? "backend OK" : "backend DOWN"}</strong> • Session:{" "}
        <code>{sessionIdRef.current}</code> • API at <code>{API_BASE}</code>
      </p>

      {/* Ask bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <input
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          placeholder="e.g., What are the main side effects of Efexor XL?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
        />
        <button onClick={handleAsk} style={{ padding: "10px 16px", borderRadius: 8 }}>Ask</button>
      </div>

      {/* Session & health row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 92 }}>Session name:</span>
          <input
            style={{ width: 220, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
            placeholder="e.g., Postman Pat"
            value={currentName}
            onChange={(e) => setCurrentName(e.target.value)}
          />
          <button
            onClick={() => {
              if (currentName.trim()) {
                localStorage.setItem("sessionName", currentName.trim());
              }
            }}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Save name
          </button>
        </div>

        <button onClick={checkHealth} style={{ padding: "8px 12px", borderRadius: 8 }}>Health check</button>

        <div style={{ marginLeft: 10 }}>
          API: <strong style={{ color: apiOK ? "green" : "crimson" }}>{apiOK ? "OK" : "DOWN"}</strong>
        </div>

        <button onClick={resetSession} style={{ marginLeft: "auto", padding: "8px 12px", borderRadius: 8 }}>
          Reset session
        </button>
      </div>

      {/* Memory toolbar (Refresh count is back) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <strong>Memory:</strong>
        <button onClick={refreshCount} style={{ padding: "6px 10px", borderRadius: 8 }}>Refresh count</button>
        <span>(items: {memCount})</span>
      </div>

      {/* Chat */}
      <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, minHeight: 280 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: m.role === "user" ? "rgba(0,128,255,.08)" : "rgba(0,255,128,.08)" }}>
            <strong>{m.role}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{m.content}</p>
          </div>
        ))}
        {isTyping && (
          <div style={{ opacity: 0.8, fontStyle: "italic", padding: "4px 8px" }}>
            assistant is typing<span className="dots">…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
