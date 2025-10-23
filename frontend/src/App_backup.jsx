import React, { useEffect, useRef, useState } from "react";

// Where the backend lives (Vite can override with VITE_API_URL)
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:3001";

/* --- Typewriter helper ---
   Emits the full text-so-far every tick.
   Returns a cancel() function. */
function typeInto(fullText, { chunkSize = 3, intervalMs = 18, onChunk, onDone }) {
  let i = 0;
  const id = setInterval(() => {
    const next = fullText.slice(0, i + chunkSize);
    if (next.length === 0) {
      clearInterval(id);
      onDone?.();
      return;
    }
    onChunk(next);
    i += chunkSize;
    if (i >= fullText.length) {
      clearInterval(id);
      onDone?.();
    }
  }, intervalMs);
  return () => clearInterval(id);
}

export default function App() {
  // ---- Health check state + function (kept INSIDE the component; hooks must be here) ----
  const [health, setHealth] = useState({ api: null, memory: null, error: null });
  async function checkHealth() {
    try {
      const sid = sessionIdRef.current || "default";
      const [hRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/memory/status`, { headers: { "X-Session-ID": sid } }),
      ]);
      const h = await hRes.json().catch(() => ({}));
      const m = await mRes.json().catch(() => ({}));
      const apiOk = h && (h.ok === true || h.body === "ok");
      const memCount = typeof m?.count === "number" ? m.count : null;
      setHealth({ api: apiOk, memory: memCount, error: null });
    } catch (e) {
      setHealth({ api: false, memory: null, error: String(e) });
    }
  }

  // ---- Core UI state ----
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting...");
  const [sessionId, setSessionId] = useState("");
  const [count, setCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const sessionIdRef = useRef(null);
  const endRef = useRef(null);
  const cancelTypeRef = useRef(null); // cancel any running typewriter

  // ---- Session boot ----
  useEffect(() => {
    const sid =
      "web-" +
      Math.random().toString(36).slice(2, 8) +
      Math.random().toString(36).slice(2, 5);
    setSessionId(sid);
    sessionIdRef.current = sid;
    setStatus("backend ?");
    // Auto health check on load
    checkHealth().then(() => setStatus("backend OK")).catch(() => setStatus("backend ?"));
  }, []);

  // ---- Scroll to bottom when messages change ----
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ---- Memory helpers ----
  async function refreshCount() {
    const r = await fetch(`${API_BASE}/memory/status`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    setCount(Number(data.count || 0));
  }

  async function loadMemory() {
    const r = await fetch(`${API_BASE}/memory/list`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    const items = Array.isArray(data.items) ? data.items : [];
    // Show as messages
    const restored = items.map((it) => ({
      role: it.type === "answer" ? "assistant" : "user",
      content: String(it.text || ""),
    }));
    setMessages(restored);
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
    const r = await fetch(`${API_BASE}/memory/list`, {
      headers: { "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-${sessionIdRef.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Ask flow ----
  async function handleAsk() {
    const q = input.trim();
    if (!q) return;

    // stop any previous typer
    if (cancelTypeRef.current) { try { cancelTypeRef.current(); } catch {} finally { cancelTypeRef.current = null; } }

    setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setInput("");
    setIsTyping(true);

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

      // Stream into UI with overlap-safe writer
      cancelTypeRef.current = typeInto(fullAnswer, {
        chunkSize: 3,
        intervalMs: 18,
        onChunk: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const i = copy.length - 1; // assistant bubble
            const prevText = copy[i].content || "";

            // If 'chunk' is full text so far, just set it. If it's delta, append only the non-overlapping tail.
            if (chunk.startsWith(prevText)) {
              copy[i].content = chunk;
            } else {
              let overlap = 0;
              const maxK = Math.min(prevText.length, chunk.length);
              for (let k = maxK; k > 0; k--) {
                if (prevText.endsWith(chunk.slice(0, k))) { overlap = k; break; }
              }
              copy[i].content = prevText + chunk.slice(overlap);
            }
            return copy;
          });
        },
        onDone: async () => {
          setIsTyping(false);
          cancelTypeRef.current = null;
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
        const i = copy.length - 1;
        copy[i] = { role: "assistant", content: "⚠️ Error fetching response." };
        return copy;
      });
    }
  }

  // ---- Render ----
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ fontSize: 42, margin: "0 0 8px" }}>GarvanGPT — Pharmacist</h1>

      <div style={{ marginBottom: 16, color: "#334" }}>
        Status: <span style={{ color: health.api ? "green" : "#999" }}>{status}</span> •{" "}
        Session: <code>{sessionId}</code> • API at <code>{API_BASE}</code>
      </div>

      {/* ---- Ask box ---- */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          placeholder="e.g., What are the main side effects of Efexor XL?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
          }}
        />
        <button onClick={handleAsk} disabled={isTyping}>Ask</button>
        {isTyping && <button onClick={() => { if (cancelTypeRef.current) { try { cancelTypeRef.current(); } catch {} } setIsTyping(false); }}>Stop</button>}
      </div>

      {/* ---- Health Check UI ---- */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        <button onClick={checkHealth}>Health check</button>
        {health.api !== null && (
          <span>
            API: <strong style={{ color: health.api ? "green" : "red" }}>{health.api ? "OK" : "DOWN"}</strong>
            {"  "}• Memory items: <strong>{health.memory ?? "—"}</strong>
            {health.error && <span style={{ color: "crimson" }}> • {health.error}</span>}
          </span>
        )}
      </div>

      {/* ---- Memory controls ---- */}
      <div style={{ marginBottom: 20 }}>
        <strong>Memory:</strong>{" "}
        <button onClick={loadMemory}>Load memory</button>
        <button onClick={refreshCount} style={{ marginLeft: 8 }}>Refresh count</button>
        <span style={{ marginLeft: 8 }}>(items: {count})</span>
        <button onClick={clearMemory} style={{ background: "#fce4ec", marginLeft: 8 }}>Clear memory</button>
        <button onClick={exportJSON} style={{ marginLeft: 8 }}>Export JSON</button>
      </div>

      {/* ---- Transcript ---- */}
      <div style={{
        background: "#f8f9fa",
        padding: 20,
        borderRadius: 10,
        minHeight: 300,
        maxHeight: 460,
        overflow: "auto",
        border: "1px solid #e2e5e7"
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 10, padding: 10, borderRadius: 8,
            background: m.role === "user" ? "rgba(0,128,255,.08)" : "rgba(0,255,128,.08)"
          }}>
            <strong>{m.role}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.content}</p>
          </div>
        ))}

        {/* typing indicator */}
        {isTyping && (
          <div style={{ opacity: .8, fontStyle: "italic", padding: "4px 8px" }}>
            assistant is typing<span className="dots">…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* tiny inline animation for the typing dots */}
      <style>{`
        @keyframes blink { 0%{opacity:.2} 20%{opacity:1} 100%{opacity:.2} }
        .dots::after { content: '…'; animation: blink 1.2s infinite; }
        button { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccd; background:#fff; }
        button:disabled { opacity: .6; }
        input, button { font-size: 14px; }
      `}</style>
    </div>
  );
}
