// frontend/src/lib/api.js

async function json(method, path, body) {
  // Use the backend base URL from Vite env. Trim any trailing slash.
  const BASE =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_API_BASE || "").trim().replace(/\/$/, "")) || "";

  // If BASE is empty, we'll still call same-origin (useful for local dev with Vite proxy).
  const url = `${BASE}${path}`;

  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });

  // Try to read text always; parse JSON if possible
  const t = await r.text().catch(() => "");
  if (!r.ok) {
    throw new Error(`${method} ${path} ${r.status} ${t}`);
  }
  try {
    return JSON.parse(t || "{}");
  } catch {
    return t;
  }
}

// Public API used by the app
const api = {
  respond: (question) => json("POST", "/api/respond", { question }),
  memList: () => json("GET", "/api/memory"),
  memAdd: (text) => json("POST", "/api/memory", { text }),
  memClear: () => json("DELETE", "/api/memory"),
};

export default api;
