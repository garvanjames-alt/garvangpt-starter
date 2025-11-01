// frontend/src/lib/api.js

// Read at build time by Vite. For production on Render, set this in the
// frontend service env vars: VITE_API_BASE=https://almosthuman-starter.onrender.com
const PROD_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE)
  ? String(import.meta.env.VITE_API_BASE).trim()
  : "";

// Normalize: no trailing slash
const BASE = PROD_BASE ? PROD_BASE.replace(/\/+$/, "") : "";

// Core JSON fetcher. Uses absolute backend URL in prod (BASE),
// and same-origin path in local dev (Vite proxy handles /api/*).
async function json(method, path, body) {
  const url = BASE ? `${BASE}${path}` : path;

  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await r.text();
  let data = {};
  try { data = JSON.parse(text || "{}"); } catch { /* ignore non-JSON */ }

  if (!r.ok) {
    const err = new Error(`${method} ${url} -> ${r.status}`);
    // helpful for quick debugging
    err.status = r.status;
    err.response = data || text;
    throw err;
  }
  return data;
}

// Public API used by the app
const api = {
  respond: (question) => json("POST", "/api/respond", { question }),
  memList: () => json("GET", "/api/memory"),
  memAdd: (text) => json("POST", "/api/memory", { text }),
  memClear: () => json("DELETE", "/api/memory"),
};

export default api;
