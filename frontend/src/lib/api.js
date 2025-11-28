// frontend/src/lib/api.js

const BASE = import.meta.env.VITE_BACKEND_URL || "";

// tiny helper
async function j(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body;
}

export async function getHealth() {
  return j("/health", { method: "GET" });
}

export async function login(username, password) {
  return j("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function adminPing() {
  return j("/api/admin/ping", { method: "GET" });
}

export async function listMemories() {
  return j("/api/memory", { method: "GET" });
}

export async function addMemory(text) {
  return j("/api/memory", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function clearMemories() {
  return j("/api/memory", { method: "DELETE" });
}

export async function askRespond(prompt) {
  return j("/api/respond", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

// back-compat alias
export const respond = askRespond;
