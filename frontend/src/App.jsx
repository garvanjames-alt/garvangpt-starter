// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getHealth,
  listMemories,
  addMemory,
  clearMemories,
  sendPrompt,
  tryCall,
} from "./lib/api";
import VoiceChat from "./VoiceChat.jsx";

export default function App() {
  // ---- state ----
  const [health, setHealth] = useState(null);
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Derived
  const disabled = useMemo(() => loading, [loading]);

  // ---- effects ----
  useEffect(() => {
    (async () => {
      // health
      const h = await getHealth().catch(() => ({ ok: false }));
      setHealth(h?.ok ? "healthy" : "unreachable");

      // memories
      const m = await listMemories().catch(() => ({ items: [] }));
      setMemories(m.items || []);
    })();
  }, []);

  // ---- handlers ----
  async function onAddMemory() {
    setError("");
    if (!newMemory.trim()) return;
    setLoading(true);
    const res = await tryCall(addMemory, newMemory.trim());
    setLoading(false);
    if (!res.ok) return setError(String(res.error || "Failed to add memory"));
    setNewMemory("");
    const m = await listMemories().catch(() => ({ items: [] }));
    setMemories(m.items || []);
  }

  async function onClearMemories() {
    setError("");
    setLoading(true);
    const res = await tryCall(clearMemories);
    setLoading(false);
    if (!res.ok) return setError(String(res.error || "Failed to clear"));
    const m = await listMemories().catch(() => ({ items: [] }));
    setMemories(m.items || []);
  }

  async function onSendPrompt(e) {
    e?.preventDefault?.();
    setError("");
    setAnswer("");
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await tryCall(sendPrompt, prompt.trim());
    setLoading(false);
    if (!res.ok) return setError(String(res.error || "Failed to respond"));
    setAnswer(res.data.text || "");
  }

  // ---- UI ----
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-4xl font-extrabold tracking-tight">
        GarvanGPT — Almost Human
      </h1>

      <div className="text-sm">
        Backend: <span className="font-medium">{health || "…"}</span>
      </div>

      {/* Memories */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Memories</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearMemories}
            disabled={disabled}
            className="rounded-xl px-3 py-2 border hover:bg-gray-50 disabled:opacity-50"
          >
            Clear all
          </button>

          <input
            className="border rounded-xl px-3 py-2 w-60"
            placeholder="Add a memory..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
          />
          <button
            onClick={onAddMemory}
            disabled={disabled || !newMemory.trim()}
            className="rounded-xl px-3 py-2 bg-black text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <ul className="list-disc pl-6">
          {memories.length === 0 ? (
            <li className="text-gray-600">No memories yet.</li>
          ) : (
            memories.map((m, i) => <li key={i}>{m}</li>)
          )}
        </ul>
      </section>

      {/* Ask */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Ask GarvanGPT</h2>
        <form onSubmit={onSendPrompt} className="flex items-center gap-2">
          <input
            className="border rounded-xl px-3 py-2 flex-1"
            placeholder="Type a question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className="rounded-xl px-3 py-2 bg-black text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>

        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">
            Assistant reply
          </div>
          <div className="text-sm whitespace-pre-wrap border rounded-xl p-3 min-h-[1.5rem]">
            {answer || "—"}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </section>

      {/* Voice */}
      <VoiceChat />
    </div>
  );
}
