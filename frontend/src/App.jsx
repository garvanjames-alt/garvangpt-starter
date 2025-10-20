import React, { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:3001";

// --- Typewriter helper (returns a cancel function) ---
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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting...");
  const [sessionId, setSessionId] = useState("");
  const [count, setCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [currentName, setCurrentName] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sessionIdRef = useRef(null);
  const endRef = useRef(null);       // <- for auto-scroll
  const cancelTypeRef = useRef(null); // <- to cancel typewriter if needed

  // --- Load stored sessions from browser ---
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("sessions") || "[]");
    setSessions(stored);
  }, []);

  // --- Startup: connect to backend ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        setStatus(data.ok ? "backend OK" : "backend error");
      } catch {
        setStatus("backend unreachable");
      }
    })();
  }, []);

  // --- Auto-scroll whenever messages change ---
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  // --- Helper: refresh memory count ---
  async function refreshCount() {
    if (!sessionIdRef.current) return;
    const r = await fetch(`${API_BASE}/memory/status`, {
      headers: {
        Origin: window.location.origin,
        "X-Session-ID": sessionIdRef.current,
      },
    });
    const data = await r.json();
    setCount(data.count || 0);
  }

  // --- Handle "Ask" (with typewriter effect) ---
  async function handleAsk() {
    const q = input.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
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


      // Stream into UI
if (cancelTypeRef.current) { try { cancelTypeRef.current(); } catch {} finally { cancelTypeRef.current = null; } }
      cancelTypeRef.current = typeInto(fullAnswer, {
        chunkSize: 3,
        intervalMs: 18,
  onChunk: (chunk) => {
  setMessages((prev) => {
    const copy = [...prev];
    const i = copy.length - 1;                 // assistant bubble
    const prevText = copy[i].content || "";

    // If chunk already contains the full text, just use it.
    if (chunk.startsWith(prevText)) {
      copy[i].content = chunk;
      return copy;
    }

    // Otherwise, chunk overlaps: append only the non-overlapping tail.
    let overlap = 0;
    const maxK = Math.min(prevText.length, chunk.length);
    for (let k = maxK; k > 0; k--) {
      if (prevText.endsWith(chunk.slice(0, k))) {
        overlap = k;
        break;
      }
    }
    copy[i].content = prevText + chunk.slice(overlap);
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error fetching response." },
      ]);
      console.error(err);
    }
  }

  // Optional: cancel typing if user clicks again while streaming
  function stopTyping() {
    if (cancelTypeRef.current) {
      cancelTypeRef.current();
      cancelTypeRef.current = null;
      setIsTyping(false);
    }
  }

  // --- Load memory into chat ---
  async function loadMemory() {
    if (!sessionIdRef.current) return;
    const r = await fetch(`${API_BASE}/memory/list`, {
      headers: { Origin: window.location.origin, "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    if (Array.isArray(data.items)) {
      const msgs = [];
      for (const it of data.items) {
        if (it.type === "question") msgs.push({ role: "user", content: it.text });
        if (it.type === "answer") msgs.push({ role: "assistant", content: it.text });
      }
      setMessages(msgs);
    }
  }

  // --- Clear memory ---
  async function clearMemory() {
    if (!sessionIdRef.current) return;
    const ok = window.confirm(`Clear all memory for session ${sessionIdRef.current}?`);
    if (!ok) return;
    await fetch(`${API_BASE}/memory/clear`, {
      method: "POST",
      headers: { Origin: window.location.origin, "X-Session-ID": sessionIdRef.current },
    });
    setMessages([]);
    setCount(0);
  }

  // --- Export JSON ---
  async function exportJSON() {
    if (!sessionIdRef.current) return;
    const r = await fetch(`${API_BASE}/memory/list`, {
      headers: { Origin: window.location.origin, "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionIdRef.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Duplicate session ---
  async function duplicateSession() {
    if (!sessionIdRef.current) return;
    const r = await fetch(`${API_BASE}/session/clone`, {
      method: "POST",
      headers: { Origin: window.location.origin, "X-Session-ID": sessionIdRef.current },
    });
    const data = await r.json();
    if (data.ok && data.to) {
      alert(`Session cloned:\n${data.from} → ${data.to}\nReloading...`);
      window.location.reload();
    }
  }

  // --- Save current session name ---
  function saveSessionName() {
    if (!sessionIdRef.current) return;
    const newName = currentName.trim();
    if (!newName) return;
    const updated = [...sessions.filter(s => s.id !== sessionIdRef.current), { id: sessionIdRef.current, name: newName }];
    setSessions(updated);
    localStorage.setItem("sessions", JSON.stringify(updated));
    alert(`Saved session as: ${newName}`);
  }

  // --- Remove from session list ---
  function removeSession() {
    const filtered = sessions.filter((s) => s.id !== sessionIdRef.current);
    setSessions(filtered);
    localStorage.setItem("sessions", JSON.stringify(filtered));
  }

  // --- Switch between saved sessions ---
  function switchSession(e) {
    const val = e.target.value;
    if (!val) return;
    setSessionId(val);
    sessionIdRef.current = val;
    setMessages([]);
    refreshCount();
  }

  // --- Boot a session on first load ---
  useEffect(() => {
    (async () => {
      if (sessions.length > 0) {
        const last = sessions[sessions.length - 1];
        setSessionId(last.id);
        sessionIdRef.current = last.id;
        await refreshCount();
        return;
      }
      const id = "web-" + Math.floor(Math.random() * 1000000);
      setSessionId(id);
      sessionIdRef.current = id;
      await refreshCount();
    })();
  }, [sessions]);

  return (
    <div style={{ padding: 30, fontFamily: "system-ui" }}>
      <h1>GarvanGPT — Pharmacist</h1>
      <p>
        Status:{" "}
        <span style={{ color: status.includes("OK") ? "green" : "red" }}>{status}</span> •
        Session: <code>{sessionId}</code> • API at <code>{API_BASE}</code>
      </p>

      <div style={{ marginBottom: 10 }}>
        <label>Current session name </label>
        <input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          placeholder="e.g., Postman Pat"
          style={{ marginRight: 8 }}
        />
        <button onClick={saveSessionName}>Save name</button>
        <button onClick={duplicateSession} style={{ marginLeft: 8 }}>Duplicate session</button>
        <button onClick={removeSession} style={{ marginLeft: 8 }}>Remove from list</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Switch session </label>
        <select onChange={switchSession} value={sessionId}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <input
          placeholder="e.g., What are the main side effects of Efexor XL?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
          style={{ flex: 1, padding: 6, fontSize: 14 }}
        />
        <button onClick={handleAsk} disabled={isTyping}>Ask</button>
        {isTyping && (
          <button onClick={stopTyping} title="Stop typing">Stop</button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <strong>Memory:</strong>{" "}
        <button onClick={loadMemory}>Load memory</button>
        <button onClick={refreshCount} style={{ marginLeft: 8 }}>
          Refresh count
        </button>
        <span style={{ marginLeft: 8 }}>(items: {count})</span>
        <button onClick={clearMemory} style={{ background: "#fce4ec", marginLeft: 8 }}>
          Clear memory
        </button>
        <button onClick={exportJSON} style={{ marginLeft: 8 }}>Export JSON</button>
      </div>

      <div
        style={{
          background: "#f8f9fa",
          padding: 20,
          borderRadius: 10,
          minHeight: 300,
          maxHeight: 420,
          overflowY: "auto",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: 10,
              background: m.role === "user" ? "rgba(0,128,255,0.1)" : "rgba(0,255,128,0.1)",
              borderRadius: 8,
            }}
          >
            <strong>{m.role}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.content}</p>
          </div>
        ))}

        {/* typing indicator */}
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
        .dots::after {
          content: ' ...';
          animation: blink 1.2s infinite;
        }
      `}</style>
    </div>
  );
}
