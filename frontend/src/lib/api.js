// frontend/src/lib/api.js
// Tiny fetch helper with timeout + JSON parsing + nice errors.

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE || "https://almosthuman-starter.onrender.com";

export const API_BASE = DEFAULT_API_BASE;

/** Core fetch with timeout + robust error messages. */
async function request(path, { method = "GET", headers = {}, body, timeoutMs = 25000 } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error("Request timeout")), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...headers },
      body,
      signal: ac.signal,
      credentials: "omit",
      cache: "no-store",
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = text || null; }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText || "Request failed";
      const err = new Error(`${res.status} ${msg}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

/** Memories API */
export async function getMemories() {
  // backend returns { items: [{ ts, text }, ...] }
  return request("/memory");
}

export async function addMemory(text) {
  if (!text || typeof text !== "string") throw new Error("addMemory(text) needs a non-empty string");
  return request("/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function clearMemories() {
  return request("/memory", { method: "DELETE" });
}

/** Prototype chat (text in → text out) */
export async function sendPrototype(text) {
  return request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

/** ElevenLabs test endpoint already wired on the backend as /tts */
export async function tts(text) {
  return request("/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    // NOTE: backend returns audio blob; this JSON helper is for JSON routes only.
  });
}
