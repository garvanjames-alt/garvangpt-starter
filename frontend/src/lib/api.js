// frontend/src/lib/api.js
// TEMP: force backend host so production calls go to the right place
const base = 'https://almosthuman-starter.onrender.com';

async function json(method, path, body) {
  const url = `${base}${path}`;
  const r = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const t = await r.text().catch(() => '');
  let data = {};
  try { data = t ? JSON.parse(t) : {}; } catch { data = {}; }

  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${t}`);
  return data;
}

const api = {
  respond: (question) => json('POST', '/api/respond', { question }),
  memList: () => json('GET', '/api/memory'),
  memAdd: (text) => json('POST', '/api/memory', { text }),
  memClear: () => json('DELETE', '/api/memory'),
};

export default api;
