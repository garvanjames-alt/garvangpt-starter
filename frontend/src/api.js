// Frontend API helpers for Almost Human (GarvanGPT)
// Replace your existing file with this one.

// --- Base URL ---------------------------------------------------------------
// Vite injects import.meta.env.VITE_API_BASE at build time.
// We also provide a safe hard fallback for local/dev or misconfig.
const DEFAULT_BASE = 'https://almosthuman-starter.onrender.com';
export const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE) ||
  DEFAULT_BASE
).replace(/\/+$/, ''); // strip any trailing slashes

// --- Core fetch wrapper ------------------------------------------------------
async function http(path, { method = 'GET', body, headers = {}, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

// --- Public API helpers ------------------------------------------------------
export async function health() {
  // Backend health endpoint
  return http('/health');
}

export async function getMemories() {
  return http('/memory');
}

export async function addMemory(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('addMemory(text) requires a non-empty string');
  }
  return http('/memory', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function clearMemories() {
  return http('/memory', { method: 'DELETE' });
}

// --- Dev aid -----------------------------------------------------------------
// Quick probe you can run from the app to confirm wiring after deploy.
export async function __probe() {
  try {
    const h = await health();
    const test = await addMemory('probe: ' + new Date().toISOString());
    return { API_BASE, health: h, addMemory: test };
  } catch (e) {
    return { API_BASE, error: e?.message || String(e) };
  }
}
