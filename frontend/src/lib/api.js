// frontend/src/lib/api.js
// API client. Reads base from Vite env, with a safe localhost fallback.

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:3001"; // <— fallback so we never hit /api/* again

const DEFAULT_HEADERS = { "Content-Type": "application/json" };

async function parseJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { error: text || "Invalid JSON" }; }
}

async function request(path, options = {}) {
  const url =
    API_BASE && path.startsWith("/")
      ? `${API_BASE}${path}`
      : `${API_BASE}/${path.replace(/^\/+/, "")}`;

  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...DEFAULT_HEADERS },
  });

  if (!res.ok) {
    let body = {};
    try { body = await parseJson(res); } catch {}
    const message = body?.error || body?.message || res.statusText || "Request failed";
    throw new Error(`${res.status} ${message}`);
  }
  return parseJson(res);
}

// ---- Health ----
export async function getHealth() { return request("/health"); }

// ---- Memory ----
export async function listMemories() {
  const data = await request("/api/memory");
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return { items };
}
export async function addMemory(text) {
  if (!text || !text.trim()) throw new Error("Memory text is required");
  return request("/api/memory", { method: "POST", body: JSON.stringify({ text }) });
}
export async function clearMemories() {
  return request("/api/memory", { method: "DELETE" });
}

// ---- Chat / Respond ----
export async function sendPrompt(prompt) {
  if (!prompt || !prompt.trim()) throw new Error("Prompt is required");
  const data = await request("/respond", {
    method: "POST",
    body: JSON.stringify({ text: prompt, prompt }),
  });
  const text = typeof data === "string" ? data : data?.text ?? "";
  return { text, raw: data };
}

// ---- Helper ----
export async function tryCall(fn, ...args) {
  try { return { ok: true, data: await fn(...args) }; }
  catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
}
