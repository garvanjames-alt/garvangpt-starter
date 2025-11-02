// frontend/src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE || "";

async function json(method, path, body) {
  const url = BASE ? `${BASE}${path}` : path;
  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try JSON first; fall back to text so we still see server errors nicely
  const txt = await r.text().catch(() => "");
  try { return JSON.parse(txt || "{}"); } catch { /* not JSON */ }

  if (!r.ok) {
    throw new Error(`${method} ${path} ${r.status} ${txt}`);
  }
  return {};
}

const api = {
  respond:  (question) => json("POST",  "/api/respond", { question }),
  memList:  ()         => json("GET",   "/api/memory"),
  memAdd:   (text)     => json("POST",  "/api/memory", { text }),
  memClear: ()         => json("DELETE","/api/memory"),
};

export default api;
