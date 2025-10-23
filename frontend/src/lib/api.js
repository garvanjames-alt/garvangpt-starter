// Simple API wrapper. Works in dev via Vite proxy and in prod via VITE_API_BASE.
const API_BASE = import.meta.env?.VITE_API_BASE || ""; // e.g., "https://almosthuman-starter.onrender.com"

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  listMemories: () => request("/api/memory"),
  addMemory: (text) => request("/api/memory", { method: "POST", body: { text } }),
  clearMemories: () => request("/api/memory", { method: "DELETE" }),
  ask: (prompt) => request("/respond", { method: "POST", body: { prompt } }),
};
