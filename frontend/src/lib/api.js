// frontend/src/lib/api.js

const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE ||
  "https://almosthuman-starter-staging.onrender.com";

export async function askGarvan(message) {
  const res = await fetch(`${BACKEND_BASE}/api/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`askGarvan failed: ${res.status} ${txt}`);
  }

  return res.json(); // { answer, sources? }
}
