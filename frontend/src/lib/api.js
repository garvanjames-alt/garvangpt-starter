// frontend/src/lib/api.js
// Small helper for calling the backend API from both local dev and Render.

// Detect if we're in the browser (Vite build runs in Node)
const isBrowser = typeof window !== "undefined";

// Decide API base:
// - Local dev (localhost / 127.0.0.1): call backend directly on 3001.
//   This avoids relying on Vite proxy (which may not be set).
// - Render/static/custom domain: call Render backend.
// - Otherwise: relative paths.
export const API_BASE = isBrowser
  ? (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1")
      ? "http://localhost:3001"
      : (window.location.hostname.includes("onrender.com") ||
         window.location.hostname.endsWith("almosthumanlabs.ai"))
          ? "https://almosthuman-starter-staging.onrender.com"
          : ""
  : "";

// Generic JSON helper
async function json(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    // include cookies for authed endpoints (memory/admin)
    credentials: "include",
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
  // Main chat answer
  // Send both {prompt} and {question} to be compatible with any backend shape.
  respond: async (question) => {
    return json("POST", "/api/respond", { prompt: question, question });
  },

  // Text-to-speech: returns an object URL for an audio blob
  tts: async (text) => {
    const res = await fetch(API_BASE + "/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      credentials: "include",
    });

    if (!res.ok) {
      const raw = await res.text();
      let msg = raw;
      try {
        const data = raw ? JSON.parse(raw) : {};
        msg = data.error || data.message || raw;
      } catch {
        // keep raw
      }
      throw new Error(msg || `TTS HTTP ${res.status}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Memories API
  listMemories: async () => {
    const data = await json("GET", "/api/memory");
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
