import React, { useState } from "react";

// Uses the same env var pattern as MemoryPanel.
// In local dev, Vite proxy handles relative /api/* to localhost backend.
// In production (Render static site), set VITE_API_BASE_URL to your backend full URL.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function AskPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(e) {
    e?.preventDefault();
    setError("");
    setAnswer("");

    const text = question.trim();
    if (!text) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setAnswer(data?.answer || "(No answer returned.)");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
        GarvanGPT — Minimal Ask Test
      </h1>

      <form onSubmit={handleAsk}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Question (dev-only)
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="what is amoxicillin"
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 6,
            border: "1px solid #444",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            resize: "vertical",
          }}
        />

        <div style={{ marginTop: 10 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 14px",
              fontWeight: 700,
              borderRadius: 6,
              border: "1px solid #666",
              background: loading ? "#333" : "#222",
              color: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Asking…" : "Ask"}
          </button>
        </div>
      </form>

      <label style={{ display: "block", fontWeight: 700, marginTop: 16 }}>
        Assistant
      </label>

      <textarea
        readOnly
        value={error ? `Error: ${error}` : answer}
        rows={8}
        placeholder="The answer will appear here…"
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          borderRadius: 6,
          border: error ? "1px solid #b33" : "1px solid #444",
          background: "rgba(255,255,255,0.05)",
          color: "inherit",
          marginTop: 6,
          resize: "vertical",
        }}
      />
    </section>
  );
}
