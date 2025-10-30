import { useState } from "react";
import { marked } from "marked";
import { RESPOND_URL, DEFAULT_QUESTION } from "./config";

export default function App() {
  const [question, setQuestion] = useState(DEFAULT_QUESTION || "");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onAsk() {
    if (!question.trim()) return;
    setIsLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch(RESPOND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const md = typeof data === "string"
        ? data
        : (data.markdown ?? data.text ?? data.answer ?? data.content ?? "");
      if (!md) throw new Error("Unexpected response shape");
      setAnswer(md);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setIsLoading(false);
    }
  }

  function onClear() {
    setQuestion("");
    setAnswer("");
    setError("");
  }

  return (
    <main style={{
      maxWidth: 900,
      margin: "40px auto",
      padding: "0 16px",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>GarvanGPT — Clinic Docs</h1>

      <label htmlFor="q" style={{ display: "block", fontWeight: 600, margin: "8px 0" }}>Question</label>
      <textarea
        id="q"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        rows={5}
        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd", fontSize: 16 }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={onAsk} disabled={isLoading} style={btnStyle}>
          {isLoading ? "Thinking…" : "Ask"}
        </button>
        <button onClick={onClear} disabled={isLoading} style={btnSecondaryStyle}>Clear</button>
        {isLoading && <Spinner />}
      </div>

      {error && (
        <div role="alert" style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          background: "#fff6f6",
          color: "#b00020",
          border: "1px solid #ffd6d6",
          whiteSpace: "pre-wrap"
        }}>
          Error: {error}
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fafafa",
            border: "1px solid #eee",
            lineHeight: 1.5
          }}
          dangerouslySetInnerHTML={{ __html: marked.parse(answer) }}
        />
      )}
    </main>
  );
}

function Spinner() {
  return (
    <span aria-label="Loading" style={{
      width: 20,
      height: 20,
      border: "3px solid rgba(0,0,0,0.15)",
      borderTopColor: "currentColor",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.8s linear infinite"
    }} />
  );
}

const btnStyle = {
  background: "black",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};

const btnSecondaryStyle = {
  background: "#f5f5f5",
  color: "#111",
  border: "1px solid #ddd",
  padding: "10px 14px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};

// keyframes for inline spinner
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
