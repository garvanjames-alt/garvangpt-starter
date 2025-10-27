import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// --- SAFE PATCH: rewrite any accidental relative "/memory" calls to the backend ---
// This protects us if any old code or a third-party hook still does fetch('/memory').
(() => {
  const DEFAULT_BASE = "https://almosthuman-starter.onrender.com";
  const API_BASE = (
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE) ||
    DEFAULT_BASE
  ).replace(/\/+$/, "");

  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      let url = typeof input === "string" ? input : input?.url;
      if (typeof url === "string" && url.startsWith("/memory")) {
        const fixed = API_BASE + url;
        return origFetch(fixed, init);
      }
    } catch (_) {
      // fall through to original fetch on any parsing error
    }
    return origFetch(input, init);
  };
})();
// --- END PATCH --------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
