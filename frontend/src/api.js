// Frontend lib API (compat shim) — use absolute backend URL
// This mirrors ../api.js and adds a couple of legacy aliases so older imports keep working.

const DEFAULT_BASE = 'https://almosthuman-starter.onrender.com';
export const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE) ||
  DEFAULT_BASE
).replace(/\/+$/, '');

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
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Public helpers
export async function health() { return http('/health'); }
export async function getMemories() { return http('/memory'); }
export async function addMemory(text) {
  if (!text || typeof text !== 'string') throw new Error('addMemory(text) requires a non-empty string');
  return http('/memory', { method: 'POST', body: JSON.stringify({ text }) });
}
export async function clearMemories() { return http('/memory', { method: 'DELETE' }); }

// Legacy alias names to avoid breaking older components
export const listMemory = getMemories;
export const clearMemory = clearMemories;

// Dev probe
export async function __probe() {
  try {
    const h = await health();
    const t = await addMemory('probe-lib: ' + new Date().toISOString());
    return { API_BASE, health: h, addMemory: t };
  } catch (e) {
    return { API_BASE, error: e?.message || String(e) };
  }
}
