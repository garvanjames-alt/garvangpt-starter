// frontend/src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function listMemories() {
  const res = await fetch(`${API_BASE}/memory`);
  if (!res.ok) throw new Error("Failed to fetch memories");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function addMemory(text) {
  const res = await fetch(`${API_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to add memory");
  return res.json();
}

export async function clearMemories() {
  const res = await fetch(`${API_BASE}/memory`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear memories");
  return res.json();
}
