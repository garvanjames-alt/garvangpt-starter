// frontend/src/lib/api.js
async function json(method, path, body) {
  // Prefer env var; otherwise, when running on Render, fall back to the backend domain.
  const ENV_BASE = import.meta?.env?.VITE_API_BASE || '';
  const isRenderProd =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.onrender.com') &&
    window.location.hostname !== 'localhost';

  // SAFETY: if the env var wasn’t inlined at build time, use the known backend URL.
  // (You can change this to your exact backend URL/name if you ever rename it.)
  const FALLBACK_BASE = 'https://almosthuman-starter.onrender.com';

  const base = ENV_BASE || (isRenderProd ? FALLBACK_BASE : '');

  // Ensure exactly one slash when joining
  const url = (base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, ''));

  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    // include credentials only if you later add auth/cookies
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${method} ${path} ${r.status} ${t || ''}`.trim());
  }
  // parse JSON if possible, otherwise pass through text
  try {
    return await r.json();
  } catch {
    const t = await r.text();
    return t ? { text: t } : {};
  }
}

const api = {
  respond: (question) => json('POST', '/api/respond', { question }),
  memList: () => json('GET', '/api/memory'),
  memAdd: (text) => json('POST', '/api/memory', { text }),
  memClear: () => json('DELETE', '/api/memory'),
};

export default api;
