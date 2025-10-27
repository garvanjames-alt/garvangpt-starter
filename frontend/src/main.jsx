import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// --- SAFE PATCH v2: rewrite any /memory calls that target the frontend origin ---
// Handles: string URLs, Request objects, absolute or relative forms.
(() => {
  const DEFAULT_BASE = "https://almosthuman-starter.onrender.com";
  const API_BASE = (
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE) ||
    DEFAULT_BASE
  ).replace(/\/+$/, "");

  const origFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    try {
      // Normalize to a URL object relative to the current origin.
      let u;
      if (typeof input === "string") {
        u = new URL(input, window.location.origin);
      } else if (input && typeof input.url === "string") {
        u = new URL(input.url, window.location.origin);
      }

      if (u) {
        const isFrontendOrigin = u.origin === window.location.origin;
        const isMemoryPath = u.pathname.startsWith("/memory");

        if (isFrontendOrigin && isMemoryPath) {
          // Preserve query string if present
          const rewritten = API_BASE + u.pathname + (u.search || "");
          return origFetch(rewritten, init ?? (typeof input === "object" ? input : undefined));
        }
      }
    } catch (_) {
      // If anything goes wrong, just fall back to the original fetch.
    }
    return origFetch(input, init);
  };
})();
// --- END PATCH v2 ------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
