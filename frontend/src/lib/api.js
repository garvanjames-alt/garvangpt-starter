// frontend/src/lib/api.js
// Small helper for calling the backend API from both local dev and Render.

// Detect if we're in the browser (Vite build runs in Node)
const isBrowser = typeof window !== "undefined";

// When running on Render (static site), talk to the Render backend.
// When running locally (`npm run dev`), keep relative `/api/...` so Vite proxy works.
export const API_BASE =
  isBrowser && window.location.hostname.includes("onrender.com")
    ? "https://almosthuman-starter-staging.onrender.com"
    : "";

// Generic JSON helper
async function json(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    let message = text;
    try {
      const data = text ? JSON.parse(text) : {};
      message = data.error || data.message || message;
    } catch {
      // ignore JSON parse error, fall back to raw text
    }
    throw new Error(message || `HTTP ${res.status}`);
  }

  return text ? JSON.parse(text) : {};
}

export const api = {
  // Core chat endpoint
  respond: async (prompt) => {
    const data = await json("POST", "/api/respond", { prompt });
    // Expected shape: { ok: true, answer, sources? }
    return data;
  },

  // Text-to-speech – returns a Blob URL you can play with new Audio(url)
  tts: async (text) => {
    const res = await fetch(API_BASE + "/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(
        t || `TTS failed with status ${res.status} ${res.statusText}`
      );
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Memories API
  listMemories: async () => {
    const data = await json("GET", "/api/memory");
    // backend returns { items: [...] }
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  },

  addMemory: async (text) => {
    return json("POST", "/api/memory", { text });
  },

  clearMemories: async () => {
    await json("DELETE", "/api/memory");
  },
};
