import React, { useEffect, useMemo, useState } from "react";
import VoiceChat from "./VoiceChat";

export default function App() {
  // -------- UI state --------
  const [question, setQuestion] = useState(
    "Using the clinic docs, what should a new patient bring?"
  );

  // memory list
  const [memories, setMemories] = useState([]);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [memError, setMemError] = useState("");

  // prototype box
  const [protoText, setProtoText] = useState("");
  const [protoReply, setProtoReply] = useState("");
  const [protoError, setProtoError] = useState("");

  // -------- Memory API helpers (all proxied to Render via /api/*) --------
  async function listMemories() {
    setMemError("");
    try {
      const r = await fetch("/api/memory");
      if (!r.ok) throw new Error(`list failed: ${r.status}`);
      const { items } = await r.json();
      setMemories(Array.isArray(items) ? items : []);
    } catch (e) {
      setMemories([]);
      setMemError(e.message || String(e));
    }
  }

  async function addMemory(text) {
    if (!text?.trim()) return;
    setLoading(true);
    setMemError("");
    try {
      const r = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`add failed: ${r.status}`);
      setNewMemoryText("");
      await listMemories();
    } catch (e) {
      setMemError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function clearMemory() {
    setLoading(true);
    setMemError("");
    try {
      const r = await fetch("/api/memory", { method: "DELETE" });
      if (!r.ok) throw new Error(`clear failed: ${r.status}`);
      await listMemories();
    } catch (e) {
      setMemError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listMemories();
  }, []);

  const memCount = useMemo(() => memories.length, [memories]);

  // -------- Prototype “send” (proxied to Render via /api/respond) --------
  async function sendToPrototype() {
    setProtoError("");
    setProtoReply("");
    try {
      const r = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: protoText }),
      });
      if (!r.ok) throw new Error(`respond failed: ${r.status}`);
      const data = await r.json();
      // backend returns { text: "...", ... } – show best available field
      setProtoReply(data.reply || data.text || JSON.stringify(data));
    } catch (e) {
      setProtoError(e.message || String(e));
    }
  }

  // -------- Render --------
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-6">GarvanGPT — Clinic Docs</h1>

      {/* Question box (wired later to your /api/respond Q&A flow if desired) */}
      <section className="mb-8">
        <label className="block font-semibold mb-2">Question</label>
        <textarea
          className="w-full h-40 rounded border p-3"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex gap-3 mt-4 items-center">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => alert("Hook this to /api/respond for Q&A")}
          >
            Ask
          </button>
          <button
            className="px-4 py-2 rounded border"
            onClick={() => setQuestion("")}
          >
            Clear
          </button>
          <span className="text-sm text-gray-500">Tip: Cmd/Ctrl + Enter</span>
        </div>
      </section>

      {/* Memories panel */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            Memories <span className="text-gray-500">({memCount})</span>
          </h2>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border"
              onClick={listMemories}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              className="px-3 py-1 rounded border"
              onClick={clearMemory}
              disabled={loading || memCount === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 rounded border p-2"
            placeholder="Add a memory…"
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addMemory(newMemoryText);
            }}
          />
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => addMemory(newMemoryText)}
            disabled={loading}
          >
            Add
          </button>
        </div>

        {memError && <div className="mb-3 text-red-600">Error: {memError}</div>}

        <ul className="space-y-2">
          {memories.map((m) => (
            <li key={m.id} className="p-3 rounded border">
              <div className="text-xs text-gray-500 mb-1">
                {m.createdAt || ""}
              </div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </li>
          ))}
          {memories.length === 0 && (
            <li className="text-gray-500">No memories yet.</li>
          )}
        </ul>
      </section>

      {/* Talk to the prototype (mic + send) */}
      <section className="mb-6">
        <h2 className="text-2xl font-bold mb-3">Talk to the prototype</h2>

        {/* Voice mic block; apiBase="/api" ensures Netlify proxies → Render */}
        <div className="mb-4">
          <VoiceChat apiBase="/api" />
        </div>

        <div className="mb-2 text-sm text-gray-600">
          SpeechRecognition OK · SpeechSynthesis OK
        </div>

        <label className="block font-semibold mb-2">Transcript</label>
        <textarea
          className="w-full h-28 rounded border p-3"
          value={protoText}
          onChange={(e) => setProtoText(e.target.value)}
          placeholder="say or type something to send…"
        />

        <div className="mt-3">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={sendToPrototype}
          >
            Send to prototype
          </button>
        </div>

        <div className="mt-4">
          <div className="font-semibold mb-1">Prototype reply</div>
          {protoError ? (
            <div className="text-red-600">Error: {protoError}</div>
          ) : (
            <div className="whitespace-pre-wrap">{protoReply}</div>
          )}
        </div>
      </section>
    </div>
  );
}
