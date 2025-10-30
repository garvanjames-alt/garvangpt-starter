import { useState, useRef } from "react";
import { marked } from "marked";
import { RESPOND_URL, DEFAULT_QUESTION } from "./config";

// Build a base URL so relative paths like "ingest/pdfs/…pdf#page=9"
// become absolute links to your backend: https://<backend>/ingest/pdfs/…pdf#page=9
const BACKEND_ORIGIN = new URL(RESPOND_URL).origin;

function linkifySources(md) {
  // Turn bare tokens like ingest/pdfs/foo.pdf#page=3 into markdown links:
  // [ingest/pdfs/foo.pdf#page=3](https://backend/ingest/pdfs/foo.pdf#page=3)
  return md.replace(/(^|\s)(ingest\/[^\s)]+)(?=\s|$)/g, (_m, lead, path) => {
    const href = `${BACKEND_ORIGIN}/${path}`;
    return `${lead}[${path}](${href})`;
  });
}

export default function App() {
  const [question, setQuestion] = useState(DEFAULT_QUESTION || "");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

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

      // Accept any of our known response shapes
      const mdRaw =
        typeof data === "string"
          ? data
          : (data.markdown ?? data.text ?? data.answer ?? data.content ?? "");

      if (!mdRaw) throw new Error("Unexpected response shape");

      // Make source paths clickable
      const mdLinked = linkifySources(mdRaw);
      setAnswer(mdLinked);
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
    textareaRef.current?.focus();
  }

  function onTextareaKeyDown(e) {
    // Submit with Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onAsk();
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: "0 16px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
        GarvanGPT — Clinic Docs
      </h1>

      <label
        htmlFor="q"
        style={{ display: "block", fontWeight: 600, margin: "8px 0" }}
      >
        Question
      </label>
      <textarea
        id="q"
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={onTextareaKeyDown}
        rows={5}
        placeholder="Type your question…  (Tip: Cmd/Ctrl + Enter to Ask)"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          fontSize: 16
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
        <button onClick={onAsk} disabled={isLoading} style={btnStyle} title="Cmd/Ctrl + Enter">
          {isLoading ? "Thinking…" : "Ask"}
        </button>
        <button onClick={onClear} disabled={isLoading} style={btnSecondaryStyle}>
          Clear
        </button>
        {isLoading && <Spinner />}
        <span style={{ color: "#666", fontSize: 13 }} aria-hidden>
          Tip: <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff6f6",
            color: "#b00020",
            border: "1px solid #ffd6d6",
            whiteSpace: "pre-wrap"
          }}
        >
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
    <span
      aria-label="Loading"
      style={{
        width: 20,
        height: 20,
        border: "3px solid rgba(0,0,0,0.15)",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.8s linear infinite"
      }}
    />
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
