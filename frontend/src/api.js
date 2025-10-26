// frontend/src/api.js

// 1) Where is the backend?
// Prefer an explicit Vite env var, otherwise fall back to same-origin (dev).
const BASE =
  import.meta?.env?.VITE_BACKEND_URL?.replace(/\/+$/, "") ||
  `${window.location.origin.replace(/\/+$/, "")}`;

// 2) Small helper around fetch
async function jfetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON is fine for /health, etc.
  }
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText;
    throw new Error(message || "request_failed");
  }
  return data ?? {};
}

// 3) API surface used by the UI
export async function listMemories() {
  return jfetch("/memory", { method: "GET" }); // -> { items: [...] }
}

export async function addMemory(text) {
  return jfetch("/memory", {
    method: "POST",
    body: JSON.stringify({ text }),
  }); // -> { ok: true }
}

export async function clearMemories() {
  return jfetch("/memory", { method: "DELETE" }); // -> { ok: true }
}

// Prototype voice reply (text in, text out)
export async function respond(prompt) {
  return jfetch("/api/respond", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  }); // -> { ok: true, reply: "..." }
}

// Optional: health check you can call from console if you like.
export async function health() {
  return jfetch("/health", { method: "GET" }); // -> { ok: true, ts: ... }
}

// Expose BASE for quick sanity checks in the console
export const API_BASE = BASE;
