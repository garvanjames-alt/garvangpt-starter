// frontend/src/lib/api.js

// Base API (backend on Render)
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://almosthuman-starter.onrender.com";

/** --- Memories --- */
export async function listMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list memories (${res.status})`);
  return res.json(); // {items:[{ts,text}]}
}

// Back-compat for Memories.jsx (imports getMemories)
export const getMemories = listMemories;

export async function addMemory(text) {
  const res = await fetch(`${API_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to add memory");
  return res.json();
}

export async function clearMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear memories");
  return res.json();
}

/** --- Prototype chat --- */
export async function sendToPrototype(text) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return res.json(); // { reply: "..." }
}

/** --- TTS --- */
export async function ttsToBlob(text) {
  const res = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS failed (${res.status})`);
  return res.blob(); // MP3 data
}
