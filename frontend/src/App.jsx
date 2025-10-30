// frontend/src/App.jsx
import React, { useState } from "react";
import { API_BASE, RESPOND_URL, DEFAULT_QUESTION } from "./config.js";

/**
 * Small helper: choose respond endpoint.
 * If RESPOND_URL is set in config.js we use it (good for proxies / dev),
 * otherwise fall back to `${API_BASE}/respond`.
 */
function getRespondUrl() {
  if (RESPOND_URL && RESPOND_URL.trim().length > 0) return RESPOND_URL;
  return `${API_BASE.replace(/\/+$/, "")}/respond`;
}

export default function App() {
  // ✅ Default prompt pre-filled; answer starts empty
  const [text, setText] = useState(DEFAULT_QUESTION);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function onAsk() {
    try {
      setLoading(true);
      setAnswer(""); // clear previous
      const res = await fetch(getRespondUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const data = await res.json();
      if (data?.ok && typeof data?.content === "string") {
        setAnswer(data.content);
      } else {
        throw new Error(
          `Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`
        );
      }
    } catch (err) {
      setAnswer(`Error: ${String(err.message || err)}`);
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setText(DEFAULT_QUESTION);
    setAnswer("");
  }

  return (
    <div className="container">
      <h1 className="text-2xl font-semibold mb-4">GarvanGPT — Clinic Docs</h1>

      <label htmlFor="q" className="sr-only">
        Question
      </label>
      <textarea
        id="q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question about the loaded clinic PDFs…"
        rows={5}
        className="w-full max-w-[640px] min-h-[96px]"
        style={{ whiteSpace: "pre-wrap" }}
      />

      <div className="mt-3 flex gap-2">
        <button onClick={onAsk} disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
        <button onClick={onClear} disabled={loading}>
          Clear
        </button>
      </div>

      {answer ? (
        <section className="mt-6">
          {/* Show the model output in a readable way without needing a markdown lib */}
          <pre className="text-sm" style={{ whiteSpace: "pre-wrap" }}>
            {answer}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
