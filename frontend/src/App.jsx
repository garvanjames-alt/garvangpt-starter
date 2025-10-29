import { useEffect, useMemo, useRef, useState } from "react";

/** -----------------------------
 *  Small API helper wrappers
 *  ----------------------------- */
async function apiGetMemory() {
  const res = await fetch("/api/memory");
  if (!res.ok) throw new Error("GET /api/memory failed");
  return res.json(); // { items: string[] }
}

async function apiAddMemory(text) {
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("POST /api/memory failed");
  return res.json(); // { ok: true }
}

async function apiClearMemory() {
  const res = await fetch("/api/memory", { method: "DELETE" });
  if (!res.ok) throw new Error("DELETE /api/memory failed");
  return res.json(); // { ok: true }
}

async function apiRespond(prompt) {
  const res = await fetch("/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("POST /respond failed");
  return res.json(); // { text, sources, usedMemories }
}

/** -----------------------------
 *  Tiny status pill
 *  ----------------------------- */
function Pill({ ok }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        background: ok ? "#E6F8EC" : "#FDECEA",
        color: ok ? "#077240" : "#B71C1C",
        border: `1px solid ${ok ? "#A9E4BD" : "#F5C6C6"}`,
      }}
    >
      {ok ? "healthy" : "down"}
    </span>
  );
}

/** -----------------------------
 *  Main App
 *  ----------------------------- */
export default function App() {
  // Backend health (simple ping against /health via the frontend proxy)
  const [healthy, setHealthy] = useState(true);
  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/health");
        setHealthy(res.ok);
      } catch {
        setHealthy(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => clearInterval(id);
  }, []);

  // Memory state
  const [memories, setMemories] = useState([]);
  const [memInput, setMemInput] = useState("");
  const [memBusy, setMemBusy] = useState(false);
  const loadMemories = async () => {
    const { items } = await apiGetMemory();
    setMemories(items || []);
  };
  useEffect(() => {
    loadMemories().catch(() => {});
  }, []);

  // Q&A
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]); // [{title, rel}]
  const [usedMemories, setUsedMemories] = useState([]); // ["memory #2", ...]
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  // Simple debug toggle
  const [showDebug, setShowDebug] = useState(false);

  // Add/clear memory handlers
  const onAddMemory = async () => {
    const text = memInput.trim();
    if (!text) return;
    setMemBusy(true);
    setError("");
    try {
      await apiAddMemory(text);
      setMemInput("");
      await loadMemories();
    } catch (e) {
      setError(e.message || "Failed to add memory");
    } finally {
      setMemBusy(false);
    }
  };
  const onClearAll = async () => {
    if (!confirm("Clear all memories?")) return;
    setMemBusy(true);
    setError("");
    try {
      await apiClearMemory();
      await loadMemories();
    } catch (e) {
      setError(e.message || "Failed to clear memories");
    } finally {
      setMemBusy(false);
    }
  };

  // Ask backend
  const onSend = async () => {
    const q = prompt.trim();
    if (!q) return;
    setAsking(true);
    setError("");
    setAnswer("");
    setSources([]);
    setUsedMemories([]);
    try {
      const { text, sources: src = [], usedMemories: um = [] } = await apiRespond(q);
      setAnswer(text || "");
      setSources(src);
      setUsedMemories(um);
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setAsking(false);
    }
  };

  // Keyboard submit
  const onPromptKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Very lightweight voice demo (kept from earlier UI)
  const recRef = useRef(null);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const speechOK = useMemo(() => typeof window !== "undefined" && "speechSynthesis" in window, []);
  const srOK = useMemo(() => {
    const w = typeof window !== "undefined" ? window : {};
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);
  const startMic = () => {
    if (!srOK) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };
  const stopMic = () => {
    recRef.current?.stop();
    setListening(false);
  };
  const speak = (text) => {
    if (!speechOK || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  // Basic layout styles (kept lightweight; Vite + no Tailwind required here)
  const card = {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px", lineHeight: 1.5 }}>
      <h1 style={{ marginBottom: 4 }}>GarvanGPT — Almost Human</h1>
      <div style={{ fontSize: 14, marginBottom: 16 }}>
        Backend: <Pill ok={healthy} />
      </div>

      {/* Memories */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Memories</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={onClearAll} disabled={memBusy}>Clear all</button>
          <input
            style={{ flex: 1 }}
            placeholder="Add a memory..."
            value={memInput}
            onChange={(e) => setMemInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" ? onAddMemory() : null}
          />
          <button onClick={onAddMemory} disabled={memBusy || !memInput.trim()}>Add</button>
        </div>
        {memories.length === 0 ? (
          <div style={{ color: "#666", fontSize: 14 }}>No memories yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {memories.map((m, i) => (<li key={i}>{m}</li>))}
          </ul>
        )}
      </section>

      {/* Ask */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Ask GarvanGPT</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Ask a question…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onPromptKey}
          />
          <button onClick={onSend} disabled={asking || !prompt.trim()}>
            {asking ? "Thinking…" : "Send"}
          </button>
        </div>

        {error && (
          <div style={{ color: "#B71C1C", marginBottom: 8 }}>Error: {error}</div>
        )}

        <div>
          <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>

          {(sources?.length || 0) > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Sources used</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sources.map((s, i) => (
                  <span
                    key={i}
                    title={s.rel || ""}
                    style={{
                      border: "1px solid #e3e3e3",
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: 12,
                      background: "#F7F7F9",
                    }}
                  >
                    {s.title || "untitled"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(usedMemories?.length || 0) > 0 && (
            <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
              <em>Memories referenced:</em> {usedMemories.join(", ")}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button onClick={() => { speak(answer); }} disabled={!speechOK || !answer}>
              Speak answer
            </button>
            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Show debug
            </label>
          </div>

          {showDebug && (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: "#0b1020",
                color: "#d6e0ff",
                borderRadius: 8,
                overflowX: "auto",
                fontSize: 12,
              }}
            >
{JSON.stringify({ sources, usedMemories }, null, 2)}
            </pre>
          )}
        </div>
      </section>

      {/* Voice prototype (optional) */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Talk to the prototype</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={startMic} disabled={!srOK || listening}>Start mic</button>
          <button onClick={stopMic} disabled={!listening}>Stop</button>
          <button
            onClick={() => { setPrompt(transcript); onSend(); }}
            disabled={!transcript.trim() || asking}
          >
            Send to prototype
          </button>
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          {srOK ? "SpeechRecognition OK" : "SpeechRecognition unavailable"} ·{" "}
          {speechOK ? "SpeechSynthesis OK" : "SpeechSynthesis unavailable"}
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Transcript</div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your transcript will appear here."
            rows={3}
            style={{ width: "100%" }}
          />
        </div>
      </section>

      <div style={{ color: "#999", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        MVP build • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
