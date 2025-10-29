import React, { useEffect, useMemo, useState } from "react";
import {
  getHealth,
  listMemories,
  addMemory,
  clearMemories,
  sendPrompt,
  tryCall,
} from "./lib/api";
import VoiceChat from "./VoiceChat.jsx"; // fixed path

export default function App() {
  // --- state ---
  const [health, setHealth] = useState(null);
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const disabled = useMemo(() => loading, [loading]);

  // --- effects ---
  useEffect(() => {
    (async () => {
      const h = await getHealth().catch(() => ({ ok: false }));
      setHealth(h?.ok ? "healthy" : "unreachable");
      const m = await listMemories().catch(() => ({ items: [] }));
      setMemories(m.items || []);
    })();
  }, []);

  // --- actions ---
  async function onAddMemory(e) {
    e?.preventDefault();
    setError("");
    if (!newMemory.trim()) return;
    setLoading(true);
    const res = await tryCall(addMemory, newMemory);
    if (!res.ok) setError(res.error);
    const m = await listMemories().catch(() => ({ items: [] }));
    setMemories(m.items || []);
    setNewMemory("");
    setLoading(false);
  }

  async function onClear() {
    setError("");
    setLoading(true);
    const res = await tryCall(clearMemories);
    if (!res.ok) setError(res.error);
    const m = await listMemories().catch(() => ({ items: [] }));
    setMemories(m.items || []);
    setLoading(false);
  }

  async function onSendPrompt(e) {
    e?.preventDefault();
    setError("");
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await tryCall(sendPrompt, prompt);
    if (res.ok) {
      const text = res.data?.text || "";
      setAnswer(text);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">GarvanGPT — Almost Human</h1>
          <span
            className={`text-sm px-2 py-1 rounded ${
              health === "healthy"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {health ? `Backend: ${health}` : "Checking..."}
          </span>
        </header>

        {/* Memories Panel */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Memories</h2>
            <button
              onClick={onClear}
              disabled={disabled}
              className="text-sm rounded-xl px-3 py-1 border hover:bg-gray-50 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <form onSubmit={onAddMemory} className="flex gap-2">
            <input
              className="flex-1 border rounded-xl px-3 py-2"
              placeholder="Add a memory..."
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
            />
            <button
              type="submit"
              disabled={disabled}
              className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <ul className="list-disc pl-6 space-y-1">
            {memories.length === 0 && (
              <li className="text-sm text-gray-500">No memories yet.</li>
            )}
            {memories.map((m, i) => (
              <li key={`${m}-${i}`} className="text-sm">
                {m}
              </li>
            ))}
          </ul>
        </section>

        {/* Chat Panel */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-3">
          <h2 className="text-lg font-medium">Ask GarvanGPT</h2>
          <form onSubmit={onSendPrompt} className="flex gap-2">
            <input
              className="flex-1 border rounded-xl px-3 py-2"
              placeholder="Type a question..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="submit"
              disabled={disabled}
              className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>

          {/* Reply box */}
          <div className="border rounded-xl p-3 bg-gray-50">
            <div className="text-xs font-medium text-gray-500 mb-1">Assistant reply</div>
            <div className="text-sm whitespace-pre-wrap min-h-[1.5rem]">
              {answer || "—"}
            </div>
          </div>
        </section>

        {/* Voice chat */}
        <VoiceChat />

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
