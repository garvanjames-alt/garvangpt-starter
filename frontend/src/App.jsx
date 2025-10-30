import { useState } from "react";
import ReactMarkdown from "react-markdown";

function extractBlock(content, heading) {
  // pull the block that follows a "## Heading" until next "##" or end
  const re = new RegExp(`##\\s*${heading}\\s*([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

function toList(block) {
  // accept either "1. item" style or "- item" lines
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && (/^\d+\.\s+/.test(l) || /^-\s+/.test(l)))
    .map((l) => l.replace(/^\d+\.\s+/, "").replace(/^-\s+/, "").trim());
}

export default function App() {
  const [text, setText] = useState(
    "From the newly loaded clinic PDFs, what should a new patient prepare or bring?"
  );
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function ask(e) {
    e?.preventDefault?.();
    setLoading(true);
    setErr("");
    setAnswer("");

    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "request_failed");
      // backend returns { ok: true, content: "markdown string..." }
      setAnswer(String(data.content || "").trim());
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const sources = toList(extractBlock(answer, "Sources used"));
  const memories = toList(extractBlock(answer, "Memories referenced"));

  return (
    <div className="min-h-screen p-6 mx-auto max-w-3xl text-slate-900">
      <h1 className="text-2xl font-semibold mb-4">GarvanGPT — Clinic PDFs</h1>

      <form onSubmit={ask} className="mb-4">
        <textarea
          className="w-full border rounded p-3 mb-2"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border"
            onClick={() => {
              setText("");
              setAnswer("");
              setErr("");
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm">
          Error: {err}
        </div>
      )}

      {answer && (
        <>
          {/* Markdown answer (already sectioned by backend) */}
          <div className="prose max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>

          {/* Simple chips for Sources & Memories */}
          {sources.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Sources used</div>
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full border px-3 py-1 text-sm"
                    title={s}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memories.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Memories referenced</div>
              <div className="flex flex-wrap gap-2">
                {memories.map((m, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full border px-3 py-1 text-sm"
                    title={m}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
