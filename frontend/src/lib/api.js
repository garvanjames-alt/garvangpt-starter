// Centralized API client for the Almost Human (GarvanGPT) frontend
// Place this file at: frontend/src/lib/api.js
// We bypass the Vite proxy and call the backend directly on :3001.

const API_BASE = "http://localhost:3001";
const DEFAULT_HEADERS = { "Content-Type": "application/json" };

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid JSON from server");
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), ...DEFAULT_HEADERS },
  });
  if (!res.ok) {
    let body = {};
    try { body = await parseJson(res); } catch (_) {}
    const message = body?.error || body?.message || res.statusText || "Request failed";
    throw new Error(`${res.status} ${message}`);
  }
  return parseJson(res);
}

// --- Health ---
export async function getHealth() {
  return request(`${API_BASE}/health`);
}

// --- Memory ---
export async function listMemories() {
  const data = await request(`${API_BASE}/api/memory`);
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return { items };
}

export async function addMemory(text) {
  if (!text || !text.trim()) throw new Error("Memory text is required");
  return request(`${API_BASE}/api/memory`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function clearMemories() {
  return request(`${API_BASE}/api/memory`, { method: "DELETE" });
}

// --- Chat / Respond ---
export async function sendPrompt(prompt) {
  if (!prompt || !prompt.trim()) throw new Error("Prompt is required");
  // Send BOTH keys to satisfy either backend contract (fallback expects {prompt},
  // custom handler may expect {text}).
  const data = await request(`${API_BASE}/respond`, {
    method: "POST",
    body: JSON.stringify({ prompt, text: prompt }),
  });
  const text =
    (typeof data === "string" ? data : null) ??
    data?.text ??
    data?.answer ??
    "";
  return { text, raw: data };
}

// Optional: small helper to safely call and capture errors in UI
export async function tryCall(fn, ...args) {
  try {
    return { ok: true, data: await fn(...args) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
