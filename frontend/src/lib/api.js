// frontend/src/lib/api.js

// Resolve your backend base URL.
// Prefer explicit env var; otherwise fall back to the public backend you’ve been using.
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== 'undefined' && window.API_BASE) ||
  'https://almosthuman-starter.onrender.com';

// GET /memory -> { ok:true, items:[{id, ts, text}, ...] }
export async function listMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to list memories (${res.status})`);
  return res.json();
}

// POST /memory  body: { text }
export async function addMemory(text) {
  const res = await fetch(`${API_BASE}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Failed to add memory (${res.status})`);
  return res.json();
}

// DELETE /memory
export async function clearMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to clear memories (${res.status})`);
  return res.json();
}
