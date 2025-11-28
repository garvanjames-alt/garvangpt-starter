// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { speak } from "./lib/tts";

const BACKEND =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export default function App() {
  // --- health
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);

  // --- auth
  const [username, setUsername] = useState("garvan");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  // --- memories
  const [memories, setMemories] = useState([]);
  const [memInput, setMemInput] = useState("");
  const memCount = memories.length;

  // --- chat
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { role: "assistant", text: "Hi Garvan — I’m Almost Human. Ask me anything." },
  ]);
  const [asking, setAsking] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);

  async function fetchHealth() {
    try {
      setHealthErr(null);
      const r = await fetch(`${BACKEND}/health`);
      const j = await r.json();
      setHealth(JSON.stringify(j, null, 2));
    } catch (e) {
      setHealthErr(String(e));
    }
  }

  async function doLogin(e) {
    e?.preventDefault();
    setLoginErr("");
    try {
      const r = await fetch(`${BACKEND}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setAuthed(false);
        setLoginErr(j?.error || "invalid credentials");
        return;
      }
      setAuthed(true);
      setLoginErr("");
      await refreshMemories();
    } catch (err) {
      setAuthed(false);
      setLoginErr(String(err));
    }
  }

  async function refreshMemories() {
    try {
      const r = await fetch(`${BACKEND}/api/memory`, {
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load memories");
      setMemories(j.items || []);
    } catch (err) {
      console.error("refreshMemories error:", err);
    }
  }

  async function addMemory() {
    const text = memInput.trim();
    if (!text) return;
    try {
      const r = await fetch(`${BACKEND}/api/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Add failed");
      setMemInput("");
      await refreshMemories();
    } catch (err) {
      console.error("addMemory error:", err);
    }
  }

  async function clearMemories() {
    try {
      const r = await fetch(`${BACKEND}/api/memory`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Clear failed");
      await refreshMemories();
    } catch (err) {
      console.error("clearMemories error:", err);
    }
  }

  async function sendChat(e) {
    e?.preventDefault();
    const q = chatInput.trim();
    if (!q || asking) return;

    setChatLog((l) => [...l, { role: "user", text: q }]);
    setChatInput("");
    setAsking(true);

    try {
      const r = await fetch(`${BACKEND}/api/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, text: q, q }),
      });

      const j = await r.json();
      const answer =
        j.answer || j.response || j.text || j.message || "(no answer)";

      setChatLog((l) => [...l, { role: "assistant", text: answer }]);

      // 🔊 Speak the answer
      setTtsBusy(true);
      await speak(answer, {
        onEnd: () => setTtsBusy(false),
        onError: () => setTtsBusy(false),
      });
    } catch (err) {
      console.error("sendChat error:", err);
      setChatLog((l) => [
        ...l,
        { role: "assistant", text: "Sorry — something went wrong." },
      ]);
      setTtsBusy(false);
    } finally {
      setAsking(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (authed) refreshMemories();
  }, [authed]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20, maxWidth: 900 }}>
      <h1>Almost Human — GarvanGPT</h1>

      <section style={{ margin: "16px 0" }}>
        <h2 style={{ margin: "12px 0 6px" }}>Backend health</h2>
        <button onClick={fetchHealth}>Re-check auth</button>
        {healthErr && (
          <div style={{ color: "crimson", marginTop: 8 }}>{healthErr}</div>
        )}
        {health && (
          <pre style={{ background: "#f3f3f3", padding: 12, marginTop: 8 }}>
            {health}
          </pre>
        )}
      </section>

      <section style={{ margin: "16px 0" }}>
        <h2 style={{ margin: "12px 0 6px" }}>Admin login</h2>
        <form onSubmit={doLogin} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
          />
          <button type="submit">Login</button>
          <span>{authed ? "Authed" : "Not authed"}</span>
        </form>
        {loginErr && (
          <div style={{ color: "crimson", marginTop: 6 }}>
            {JSON.stringify({ error: loginErr })}
          </div>
        )}
      </section>

      <section style={{ margin: "16px 0" }}>
        <h2 style={{ margin: "12px 0 6px" }}>Memories ({memCount})</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={refreshMemories} disabled={!authed}>
            Refresh
          </button>
          <button onClick={clearMemories} disabled={!authed}>
            Clear all
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ flex: 1 }}
            value={memInput}
            onChange={(e) => setMemInput(e.target.value)}
            placeholder={authed ? "Add a memory..." : "Login to add memories"}
            disabled={!authed}
            onKeyDown={(e) => e.key === "Enter" && addMemory()}
          />
          <button onClick={addMemory} disabled={!authed}>
            Add
          </button>
        </div>

        {!authed && <div>Login to view or edit memories.</div>}

        {authed && (
          <ul style={{ background: "#f7f7f7", padding: 12 }}>
            {memories.slice(0, 100).map((m) => (
              <li key={m.id} style={{ marginBottom: 8 }}>
                {m.text}
              </li>
            ))}
          </ul>
        )}

        {authed && memCount > 100 && (
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            Showing first 100 / {memCount}
          </div>
        )}
      </section>

      <section style={{ margin: "16px 0" }}>
        <h2 style={{ margin: "12px 0 6px" }}>Chat</h2>

        <div style={{ background: "#f7f7f7", padding: 12, minHeight: 200 }}>
          {chatLog.map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong>{m.role === "user" ? "You" : "Almost Human"}:</strong>{" "}
              <span>{m.text}</span>
            </div>
          ))}
        </div>

        <form onSubmit={sendChat} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            style={{ flex: 1 }}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your question..."
            disabled={asking}
          />
          <button type="submit" disabled={asking}>
            {asking ? "..." : "Send"}
          </button>
        </form>

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          {ttsBusy ? "Speaking…" : ""}
        </div>
      </section>
    </div>
  );
}
