import React, { useEffect, useRef, useState } from "react";

// ---- Config ----
const API_BASE = "http://localhost:3001";

// Small helper to make a new session id
function newSessionId() {
  return `web-${Math.random().toString(36).slice(2, 8)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ---- Health check state + function ----
async function checkHealth(base, sid) {
  try {
    const [hRes, mRes] = await Promise.all([
      fetch(`${base}/health`),
      fetch(`${base}/memory/status`, { headers: { "X-Session-ID": sid } }),
    ]);

    const h = await hRes.json().catch(() => ({}));
    const m = await mRes.json().catch(() => ({}));

    const apiok = (h && (h.ok === true || h.body === "ok")) ? true : false;
    const memCount = (typeof m?.count === "number") ? m.count : null;

    return { api: apiok, memory: memCount, error: null };
  } catch (e) {
    return { api: false, memory: null, error: String(e) };
  }
}

// ---- Typewriter helper (returns a cancel function) ----
function typeInto(fullText, { chunkSize = 3, intervalMs = 18, onChunk, onDone }) {
  let i = 0;
  let prevText = "";

  const id = setInterval(() => {
    const next = fullText.slice(0, i + chunkSize);
    if (next.length === 0) {
      clearInterval(id);
      onDone?.();
      return;
    }

    // Replace or append safely to avoid gibberish if we get out of sync
    const chunk = next.startsWith(prevText) ? next : prevText + next;
    prevText = chunk;
    onChunk?.(chunk);

    i += chunkSize;
    if (i >= fullText.length) {
      clearInterval(id);
      onDone?.();
    }
  }, intervalMs);

  return () => clearInterval(id);
}

export default function App() {
  // ---- Top-level state ----
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting...");
  const [sessionId, setSessionId] = useState("");
  const [count, setCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // session tracking (ref used for headers)
  const sessionIdRef = useRef(null);

  // scrolling + cancel current typewriter
  const endRef = useRef(null);
  const cancelTypeRef = useRef(null);

  // ---- Session name (nicknames saved in browser) ----
  const [currentName, setCurrentName] = useState("");
  const sessionNamesKey = "ggpt_session_names";
  const lastSessionKey = "ggpt_last_session";

  function loadName() {
    try {
      const map = JSON.parse(localStorage.getItem(sessionNamesKey) || "{}");
      setCurrentName(map[sessionIdRef.current] || "");
    } catch (_) {}
  }

  function saveName() {
    try {
      const map = JSON.parse(localStorage.getItem(sessionNamesKey) || "{}");
      map[sessionIdRef.current] = currentName.trim();
      localStorage.setItem(sessionNamesKey, JSON.stringify(map));
    } catch (_) {}
  }

  function persistLastSession() {
    try { localStorage.setItem(lastSessionKey, sessionIdRef.current); } catch (_) {}
  }

  // ---- Load last session (or create new) + initial health ----
  useEffect(() => {
    const last = localStorage.getItem(lastSessionKey);
    const sid = last || newSessionId();
    sessionIdRef.current = sid;
    setSessionId(sid);
    persistLastSession();
    loadName();

    (async () => {
      const h = await checkHealth(API_BASE, sid);
      const okTxt = h.api ? "OK" : "DOWN";
      const memTxt = (typeof h.memory === "number") ? h.memory : 0;
      setStatus(`backend ${okTxt}`);
      setCount(memTxt);
    })();
  }, []);

  // ---- Auto-scroll when messages change ----
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Memory helpers ----
  async function refreshCount() {
    const res = await fetch(`${API_BASE}/memory/status`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const m = await res.json().catch(() => ({}));
    setCount(typeof m?.count === "number" ? m.count : 0);
  }

  async function loadMemory() {
    const res = await fetch(`${API_BASE}/memory/list`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const data = await res.json().catch(() => ({ items: [] }));
    const msgs = (data.items || []).map((it) => ({
      role: it.type === "assistant" ? "assistant" : "user",
      content: String(it.text || ""),
    }));
    setMessages(msgs);
    setCount(msgs.length);
  }

  async function clearMemory() {
    await fetch(`${API_BASE}/memory/clear`, {
      method: "POST",
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    setMessages([]);
    setCount(0);
  }

  async function exportJSON() {
    const res = await fetch(`${API_BASE}/memory/list`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const data = await res.json().catch(() => ({ items: [] }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionIdRef.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Reset session (new chat) ----
  function resetSession() {
    // cancel any typewriter
    cancelTypeRef.current?.();
    cancelTypeRef.current = null;
    setIsTyping(false);

    const sid = newSessionId();
    sessionIdRef.current = sid;
    setSessionId(sid);
    setMessages([]);
    setCount(0);
    persistLastSession();
    loadName();
  }

  // ---- Ask flow ----
  async function handleAsk() {
    const q = input.trim();
    if (!q) return;

    // Cancel any current typing animation
    cancelTypeRef.current?.();
    cancelTypeRef.current = null;

    // optimistic UI
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    const assistantIndexRef = { i: null };
    setMessages((prev) => {
      const copy = [...prev, { role: "assistant", content: "" }];
      assistantIndexRef.i = copy.length - 1;
      return copy;
    });
    setIsTyping(true);
    setInput("");

    try {
      // Save question
      await fetch(`${API_BASE}/memory/save`, {
        method: "POST",
        headers: {
          Origin: window.location.origin,
          "Content-Type": "application/json",
          "X-Session-ID": sessionIdRef.current,
        },
        body: JSON.stringify({ type: "question", text: q }),
      });

      // Ask backend
      const r = await fetch(`${API_BASE}/respond`, {
        method: "POST",
        headers: {
          Origin: window.location.origin,
          "Content-Type": "application/json",
          "X-Session-ID": sessionIdRef.current,
        },
        body: JSON.stringify({ prompt: q }),
      });

      const data = await r.json();
      const fullAnswer = data.reply ?? data.answer ?? String(data.body ?? "");

      // Stream into UI using a safe typewriter
      cancelTypeRef.current = typeInto(fullAnswer, {
        chunkSize: 3,
        intervalMs: 18,
        onChunk: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const i = assistantIndexRef.i ?? copy.length - 1;
            const prevText = copy[i].content || "";
            copy[i].content = chunk.startsWith(prevText) ? chunk : prevText + chunk;
            return copy;
          });
        },
        onDone: async () => {
          setIsTyping(false);
          cancelTypeRef.current = null;
          // Save full answer
          await fetch(`${API_BASE}/memory/save`, {
            method: "POST",
            headers: {
              Origin: window.location.origin,
              "Content-Type": "application/json",
              "X-Session-ID": sessionIdRef.current,
            },
            body: JSON.stringify({ type: "answer", text: fullAnswer }),
          });
          await refreshCount();
        },
      });
    } catch (err) {
      setIsTyping(false);
      cancelTypeRef.current = null;
      setMessages((prev) => {
        const copy = [...prev];
        const i = (copy.length - 1);
        copy[i] = { role: "assistant", content: "⚠️ Error fetching response." };
        return copy;
      });
    }
  }

  // ---- UI ----
  const backendOk = status.includes("OK");

  return (
    <div style={{ maxWidth: 940, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 44, marginBottom: 8 }}>
        GarvanGPT — Pharmacist
      </h1>

      <div style={{ color: "#222", marginBottom: 12 }}>
        <strong>Status:</strong>{" "}
        <span style={{ color: backendOk ? "green" : "crimson" }}>
          backend {backendOk ? "OK" : "DOWN"}
        </span>{" "}
        • <strong>Session:</strong> {sessionId} • <strong>API</strong> at{" "}
        {API_BASE}
      </div>

      {/* Prompt row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., What are the main side effects of Efexor XL?"
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button onClick={handleAsk} disabled={isTyping} style={{ padding: "10px 14px" }}>
          Ask
        </button>
      </div>

      {/* Session nickname controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 12px" }}>
        <strong>Session name:</strong>
        <input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          placeholder="e.g., Postman Pat"
          style={{ padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, width: 220 }}
        />
        <button onClick={saveName}>Save name</button>
      </div>

      {/* Health + controls row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "6px 0 16px" }}>
        <button
          onClick={async () => {
            const h = await checkHealth(API_BASE, sessionIdRef.current);
            const okTxt = h.api ? "OK" : "DOWN";
            const memTxt = (typeof h.memory === "number") ? h.memory : 0;
            setStatus(`backend ${okTxt}`);
            setCount(memTxt);
          }}
        >
          Health check
        </button>
        <span>API: <strong style={{ color: backendOk ? "green" : "crimson" }}>{backendOk ? "OK" : "DOWN"}</strong></span>
        <span>•</span>
        <span>Memory items: <strong>{count}</strong></span>
        <button onClick={resetSession} style={{ marginLeft: 12 }}>
          Reset session
        </button>
      </div>

      {/* Memory toolbar */}
      <div style={{ marginBottom: 10 }}>
        <strong>Memory:</strong>{" "}
        <button onClick={loadMemory} style={{ marginRight: 8 }}>Load memory</button>
        <button onClick={refreshCount} style={{ marginRight: 8 }}>Refresh count</button>
        <span style={{ marginRight: 8 }}>(items: {count})</span>
        <button onClick={clearMemory} style={{ background: "#fee4e2", marginRight: 8 }}>Clear memory</button>
        <button onClick={exportJSON}>Export JSON</button>
      </div>

      {/* Messages */}
      <div
        style={{
          background: "#f8fafb",
          padding: 20,
          borderRadius: 10,
          minHeight: 300,
          maxHeight: 540,
          overflow: "auto",
          border: "1px solid #eee",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              background: m.role === "user" ? "rgba(0,128,255,0.08)" : "rgba(0,255,128,0.08)",
            }}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>{m.role}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.content}</p>
          </div>
        ))}
        {isTyping && (
          <div style={{ opacity: 0.8, fontStyle: "italic", padding: "4px 8px" }}>
            assistant is typing<span className="dots">…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* tiny inline animation for the typing dots */}
      <style>{`
        @keyframes blink { 0%{opacity:.2} 20%{opacity:1} 100%{opacity:.2} }
        .dots::after { content: '…'; animation: blink 1.05s infinite; }
      `}</style>
    </div>
  );
}
