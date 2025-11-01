// frontend/src/lib/api.js

async function json(method, path, body) {
  // Prefer build-time Vite env, else optional window override,
  // else hard fallback to your Render backend.
  const API_BASE =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE) ||
    (typeof window !== "undefined" && window.__APP_API_BASE__) ||
    "https://almosthuman-starter.onrender.com";

  const url = API_BASE.replace(/\/+$/, "") + path;

  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${method} ${path} -> ${r.status} ${r.statusText} ${txt}`);
  }

  const t = await r.text().catch(() => "");
  try {
    return JSON.parse(t);
  } catch {
    return t ? { ok: true } : {};
  }
}

const api = {
  respond: (question) => json("POST", "/api/respond", { question }),
  memList: () => json("GET", "/api/memory"),
  memAdd: (text) => json("POST", "/api/memory", { text }),
  memClear: () => json("DELETE", "/api/memory"),
};

export default api;
