// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import VoiceChat from "./VoiceChat.jsx";

/**
 * App: GarvanGPT — Almost Human
 * - Lists memories (GET/POST/DELETE /api/memory)
 * - Asks backend for an answer (POST /api/respond)
 * - Shows which memories were used, with cosine scores
 * - Pulses the avatar mouth briefly when a new answer arrives
 */

const API_BASE = import.meta.env?.VITE_API_BASE || "/api";

export default function App() {
  // --- UI state
  const [memories, setMemories] = useState([]); // [{id,text}]
  const [newMemory, setNewMemory] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // RAG debug
  const [usedMemories, setUsedMemories] = useState([]); // ['id', ...]
  const [usedDetails, setUsedDetails] = useState([]);   // [{id,text,score}]
  const [rawResp, setRawResp] = useState(null);

  // Score filter slider
  const [minScore, setMinScore] = useState(0.0);

  // Avatar mouth pulse
  const [speaking, setSpeaking] = useState(false);
  const speakTimer = useRef(null);

  useEffect(() => {
    refreshMemories();
    return () => {
      if (speakTimer.current) clearTimeout(speakTimer.current);
    };
  }, []);

  // ---- API helpers
  async function refreshMemories() {
    try {
      const r = await fetch(`${API_BASE}/memory`, { cache: "no-store" });
      const data = await r.json();
      setMemories(data?.items || []);
    } catch (e) {
      console.error("Failed to load memories", e);
    }
  }

  async function addMemory(e) {
    e?.preventDefault();
    const text = newMemory.trim();
    if (!text) return;
    try {
      await fetch(`${API_BASE}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setNewMemory("");
      refreshMemories();
    } catch (e) {
      console.error("Add memory failed", e);
    }
  }

  async function clearMemories() {
    if (!confirm("Delete all memories?")) return;
    try {
      await fetch(`${API_BASE}/memory`, { method: "DELETE" });
      refreshMemories();
    } catch (e) {
      console.error("Clear memories failed", e);
    }
  }

  async function askBackend(e) {
    e?.preventDefault();
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await r.json();
      setRawResp(data || null);

      // core fields
      setAnswer(data?.answer || "");

      // details from enhanced backend (id,text,score)
      const details = Array.isArray(data?.used_details) ? data.used_details : [];

      // fallback: if backend didn’t send details, synthesize from ids we got
      const ids = Array.isArray(data?.used_memories) ? data.used_memories : [];
      setUsedMemories(ids);
      if (details.length) {
        setUsedDetails(details);
      } else {
        // map ids -> text, score=NaN
        const m = new Map(memories.map((x) => [x.id, x.text]));
        setUsedDetails(ids.map((id) => ({ id, text: m.get(id) || "", score: NaN })));
      }

      // pulse the avatar mouth ~1.2s
      if (speakTimer.current) clearTimeout(speakTimer.current);
      setSpeaking(true);
      speakTimer.current = setTimeout(() => setSpeaking(false), 1200);
    } catch (e) {
      console.error("Ask failed", e);
      setAnswer("Sorry — something went sideways talking to the backend.");
      setUsedMemories([]);
      setUsedDetails([]);
    } finally {
      setLoading(false);
    }
  }

  // derived view of details after minScore filter
  const filteredDetails = usedDetails.filter((d) =>
    Number.isFinite(d.score) ? d.score >= minScore : true
  );

  return (
    <div className="app">
      <header className="header">
        <h1>GarvanGPT — Almost Human</h1>
        <div className="subtle">
          API base: <code>(proxy via Vite)</code> · local dev UI → <code>backend</code>{" "}
          <code>/api</code>
        </div>
      </header>

      {/* Avatar preview */}
      <section className="card">
        <h2>Avatar (preview)</h2>
        <div className="row">
          <Avatar role="Pharmacist" speaking={speaking} />
          <div className="muted">
            Static preview — mouth animation pulses briefly when a reply arrives.
          </div>
        </div>
      </section>

      {/* Memories */}
      <section className="card">
        <h2>Memories</h2>
        <form className="row gap" onSubmit={addMemory}>
          <input
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Add a memory…"
          />
          <button type="submit">Add</button>
          <button type="button" onClick={clearMemories}>
            Clear
          </button>
        </form>

        <ul className="list">
          {memories.map((m) => (
            <li key={m.id}>
              <span>{m.text}</span>
              <small className="idtag">{m.id}</small>
            </li>
          ))}
        </ul>
      </section>

      {/* Ask / Respond */}
      <section className="card">
        <h2>Ask / Respond</h2>
        <form onSubmit={askBackend} className="col gap">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the Almost Human avatar…"
            rows={3}
          />
          <div className="row gap wrap">
            <button type="submit" disabled={loading}>
              {loading ? "Thinking…" : "Ask"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrompt("");
                setAnswer("");
                setUsedMemories([]);
                setUsedDetails([]);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {/* Score filter only visible when we have details */}
        {usedDetails.length > 0 && (
          <div className="row gap center">
            <label className="muted">Min score: {minScore.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              style={{ width: 320 }}
            />
            <small className="muted">
              showing {filteredDetails.length}/{usedDetails.length}
            </small>
          </div>
        )}

        <div className="answer">
          <h3>Answer</h3>
          <p>{answer || "—"}</p>

          {/* Used memories pills */}
          {usedDetails.length > 0 && (
            <>
              <div className="muted">Used memories</div>
              <div className="pills">
                {filteredDetails.map((u) => (
                  <span key={u.id} className="pill">
                    {u.id}
                    {Number.isFinite(u.score) && (
                      <span className="score">{u.score.toFixed(3)}</span>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Debug block */}
        <details>
          <summary>Raw response (debug)</summary>
          <pre>{JSON.stringify(rawResp, null, 2)}</pre>
        </details>
      </section>

      {/* Realtime voice */}
      <section className="card">
        <h2>Realtime Voice (beta)</h2>
        <VoiceChat />
      </section>

      {/* minimal styles */}
      <style>{`
        :root { --bg:#0b0c10; --fg:#e8eef2; --muted:#9aa7b2; --card:#14171c; --pill:#1f2430; --accent:#2f7cf6; }
        * { box-sizing:border-box; }
        body { margin:0; background:var(--bg); color:var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
        .app { max-width: 920px; margin: 24px auto 80px; padding: 0 16px; }
        .header h1 { margin: 0 0 6px; font-size: 40px; letter-spacing: 0.2px; }
        .subtle { color: var(--muted); font-size: 14px; margin-bottom: 6px; }
        .muted { color: var(--muted); }
        .card { background: var(--card); border: 1px solid #1b1f26; border-radius: 14px; padding: 16px 18px; margin: 18px 0; }
        .row { display:flex; align-items:center; gap:14px; }
        .col { display:flex; flex-direction:column; }
        .gap { gap: 10px; }
        .wrap { flex-wrap: wrap; }
        .center { align-items: center; }
        input[type="text"], input[type="search"], textarea, input:not([type]) {
          width: 100%; background: #0f1318; color: var(--fg); border: 1px solid #202531; padding: 10px 12px; border-radius: 10px;
        }
        input[type="range"] { accent-color: var(--accent); }
        button {
          background: #0f141a; color: var(--fg); border: 1px solid #232a36; padding: 9px 14px;
          border-radius: 10px; cursor: pointer;
        }
        button:hover { border-color:#2b3445; }
        .list { list-style: disc; margin: 12px 0 0 22px; padding: 0; }
        .list li { margin: 10px 0; }
        .idtag { margin-left: 10px; color: var(--muted); }
        .answer { margin-top: 12px; }
        .answer h3 { margin: 0 0 8px; }
        .pills { display:flex; gap:8px; flex-wrap:wrap; margin-top: 8px; }
        .pill {
          display:inline-flex; align-items:center; gap:8px; background: var(--pill);
          border: 1px solid #2a3140; border-radius: 999px; padding: 6px 10px; font-size: 12px;
        }
        .pill .score { color: #9ad0ff; font-weight: 600; }
      `}</style>
    </div>
  );
}
