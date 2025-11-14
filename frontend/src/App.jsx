import React, { useState } from "react";
import { api } from "./lib/api";

// Very small, safe App that talks to the backend via api.respond()
export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [readAloud, setReadAloud] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(event) {
    if (event) event.preventDefault();
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      // Call backend via our helper – this will POST { prompt: ... }
      const data = await api.respond(q);
      const a = data.answer || "";
      setAnswer(a);

      // Optional: try TTS, but don't fail the whole request if it breaks
      if (readAloud && a) {
        try {
          const url = await api.tts(a);
          const audio = new Audio(url);
          audio.play();
        } catch (e) {
          console.error("TTS failed:", e);
        }
      }
    } catch (e) {
      console.error("Ask error:", e);
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#f5f5f5",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "16px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>
        GarvanGPT — “Almost Human” (Local MVP)
      </h1>
      <p style={{ marginBottom: "24px", color: "#bbb" }}>
        Backend at <strong>3001</strong>; Frontend at <strong>5173</strong>. API base via Vite
        proxy or Render static site.
      </p>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
          Question (dev-only)
        </h2>
        <form onSubmit={handleAsk}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="what is amoxicillin"
            rows={2}
            style={{
              width: "100%",
              background: "#222",
              color: "#f5f5f5",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "8px",
              resize: "vertical",
              marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "6px 14px",
                borderRadius: "4px",
                border: "none",
                background: loading ? "#555" : "#0ea5e9",
                color: "#fff",
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Asking…" : "Ask"}
            </button>
            <label style={{ fontSize: "14px", color: "#ddd" }}>
              <input
                type="checkbox"
                checked={readAloud}
                onChange={(e) => setReadAloud(e.target.checked)}
                style={{ marginRight: "4px" }}
              />
              Read aloud (ElevenLabs)
            </label>
          </div>
        </form>
      </section>

      <section style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
          Assistant
        </h2>
        <textarea
          readOnly
          value={answer}
          placeholder="The answer will appear here…"
          rows={8}
          style={{
            width: "100%",
            background: "#181818",
            color: "#f5f5f5",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "8px",
            resize: "vertical",
          }}
        />
      </section>

      {error && (
        <div style={{ color: "#fecaca", marginTop: "8px" }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
