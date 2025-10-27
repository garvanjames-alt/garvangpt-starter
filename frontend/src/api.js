// Simple frontend API client for the Memory demo (and /api/respond later)

const BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/+$/, "") || ""; // e.g. https://almosthuman-starter.onrender.com

function url(path) {
  // always hit the backend, never the static origin
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getMemories() {
  const r = await fetch(url("/memory"), { method: "GET" });
  if (!r.ok) throw new Error(`GET /memory failed: ${r.status}`);
  return r.json(); // -> { ok:true, items:[...] }
}

export async function addMemory(text) {
  const r = await fetch(url("/memory"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`POST /memory failed: ${r.status}`);
  return r.json(); // -> { ok:true, item:{...} }
}

export async function clearMemories() {
  // clear all memories
  const r = await fetch(url("/memory"), { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE /memory failed: ${r.status}`);
  return r.json(); // -> { ok:true, cleared:n }
}

// Optional health probe you can run from the console if needed
export async function health() {
  const r = await fetch(url("/health"), { method: "GET" });
  return r.json(); // -> { ok:true, ts:"..." }
}

// Export BASE for quick sanity checks from the browser console
export const API_BASE = BASE;
