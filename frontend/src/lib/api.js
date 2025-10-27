// frontend/src/lib/api.js

// Base API (backend on Render)
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://almosthuman-starter.onrender.com";

/** List memories (optional helper; UI may not use yet) */
export async function listMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list memories (${res.status})`);
  return res.json(); // {items:[{ts,text}]}
}

/** Add one memory */
export async function addMemory(text) {
  const res = await fetch(`${API_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to add memory");
  return res.json();
}

/** Clear all memories */
export async function clearMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear memories");
  return res.json();
}

/** Send text to prototype (LLM). Returns {reply: string} */
export async function sendToPrototype(text) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return res.json(); // { reply: "..." }
}

/** Turn text into speech via backend ElevenLabs proxy. Returns a Blob (audio/mpeg). */
export async function ttsToBlob(text) {
  const res = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS failed (${res.status})`);
  return res.blob(); // MP3 data
}
