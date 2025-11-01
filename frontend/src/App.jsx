import React, { useEffect, useRef, useState } from "react";

// Point to your local backend API
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

export default function App() {
  // Dev question box
  const [question, setQuestion] = useState("");
  const [loadingAsk, setLoadingAsk] = useState(false);

  // Prototype chat
  const [protoText, setProtoText] = useState("");
  const [assistant, setAssistant] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const lastSpokenRef = useRef("");

  // Memories UI
  const [usedMemories, setUsedMemories] = useState([]); // optional: shows memories used in the last response
  const [memories, setMemories] = useState([]);         // full list for Load/Clear/Add
  const [newMemory, setNewMemory] = useState("");
  const [loadingProto, setLoadingProto] = useState(false);

  // ===== simple, placeholder TTS (browser speechSynthesis) =====
  useEffect(() => {
    if (!ttsEnabled) return;
    if (!assistant || assistant === lastSpokenRef.current) return;
    try {
      const utter = new SpeechSynthesisUtterance(assistant);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      lastSpokenRef.current = assistant;
    } catch (e) {
      // ignore TTS errors for now
    }
  }, [assistant, ttsEnabled]);

  // ===== backend calls =====
  async function postRespond(message) {
    const res = await fetch(`${API_BASE}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`respond ${res.status}`);
    return res.json();
  }

  // Memories API — NOTE: the base route is /api/memory (no /list)
  async function loadMemories() {
    const res = await fetch(`${API_BASE}/memory`, { method: "GET" });
    if (!res.ok) throw new Error(`memory GET ${res.status}`);
    const data = await res.json(); // shape: { items: [...] }
    setMemories(Array.isArray(data.items) ? data.items : []);
  }

  async function addMemory(text) {
    const res = await fetch(`${API_BASE}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`memory POST ${res.status}`);
    await loadMemories();
  }

  async function clearMemories() {
    const res = await fetch(`${API_BASE}/memory`, { method: "DELETE" });
    if (!res.ok) throw new Error(`memory DELETE ${res.status}`);
    await loadMemories();
  }

  // ===== handlers =====
  async function handleAsk() {
    const msg = question.trim();
    if (!msg) return;
    setLoadingAsk(true);
    try {
      const data = await postRespond(msg);
      setAssistant(data?.text || "(no reply)");
      setUsedMemories(
        Array.isArray(data?.usedMemories) ? data.usedMemories : []
      );
    } catch (e) {
      setAssistant(`(error) ${String(e.message || e)}`);
    } finally {
      setLoadingAsk(false);
    }
  }

  async function handleSendToPrototype() {
    const msg = protoText.trim();
    if (!msg) return;
    setLoadingProto(true);
    try {
      const data = await postRespond(msg);
      setAssistant(data?.text || "(no reply)");
      setUsedMemories(
        Array.isArray(data?.usedMemories) ? data.usedMemories : []
      );
    } catch (e) {
      setAssistant(`(error) ${String(e.message || e)}`);
    } finally {
      setLoadingProto(false);
    }
  }

  function handleAppendFromMic(t) {
    if (!t) return;
    setProtoText((p) => (p ? p + " " + t : t));
  }

  // ===== UI =====
  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>GarvanGPT — “Almost Human” (Local MVP)</h1>
      <p style={{ marginTop: 4 }}>
        Backend at <b>3001</b>; Frontend at <b>5173</b>. API base:{" "}
        <a href={API_BASE} target="_blank" rel="noreferrer">
          {API_BASE}
        </a>
      </p>

      {/* Dev question box */}
      <section style={{ marginTop: 24 }}>
        <h3>Question (dev-only)</h3>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type a quick test question…"
          rows={3}
          style={{ width: "100%" }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button disabled={loadingAsk} onClick={handleAsk}>
            {loadingAsk ? "Asking…" : "Ask"}
          </button>
          <button onClick={() => setQuestion("")}>Clear</button>
        </div>
      </section>

      {/* Prototype chat */}
      <section style={{ marginTop: 32 }}>
        <h3>Talk to the prototype</h3>
        <textarea
          value={protoText}
          onChange={(e) => setProtoText(e.target.value)}
          placeholder="Speak or type here…"
          rows={4}
          style={{ width: "100%" }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => handleAppendFromMic("…mic text…")} title="placeholder mic">
            Start mic
          </button>
          <button disabled={loadingProto} onClick={handleSendToPrototype}>
            {loadingProto ? "Sending…" : "Send to prototype"}
          </button>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={ttsEnabled}
              onChange={(e) => setTtsEnabled(e.target.checked)}
            />
            Read assistant reply aloud (placeholder TTS)
          </label>
        </div>
      </section>

      {/* Assistant box */}
      <section style={{ marginTop: 24 }}>
        <h3>Assistant</h3>
        <textarea
          value={assistant || "—"}
          readOnly
          rows={4}
          style={{ width: "100%" }}
        />
      </section>

      {/* Memories panel */}
      <section style={{ marginTop: 32 }}>
        <h3>Memories (count: {memories.length})</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={loadMemories}>Load</button>
          <button onClick={clearMemories}>Clear all</button>
        </div>

        <ul style={{ paddingLeft: 18 }}>
          {memories.map((m) => (
            <li key={String(m.id)}>
              <code>{m.text}</code>
            </li>
          ))}
          {memories.length === 0 && <li style={{ opacity: 0.6 }}>(no memories)</li>}
        </ul>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Add a new memory…"
            style={{ flex: 1, padding: "8px 10px" }}
          />
          <button
            onClick={async () => {
              const t = newMemory.trim();
              if (!t) return;
              await addMemory(t);
              setNewMemory("");
            }}
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
