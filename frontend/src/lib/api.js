// frontend/src/lib/api.js
// Centralized helper so dev/prod both "just work".

const API_BASE =
  // In production, set this in Render as VITE_API_BASE=https://<your-backend>.onrender.com
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  ''; // dev (Vite proxy) → same origin

async function json(method, path, body) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${method} ${path} ${r.status} ${t}`);
  }
  return r.json();
}

// Public API used by the app
export const api = {
  respond: (question) => json('POST', '/api/respond', { question }),
  memList: () => json('GET', '/api/memory'),
  memAdd: (text) => json('POST', '/api/memory', { text }),
  memClear: () => json('DELETE', '/api/memory'),
};

export default api;
