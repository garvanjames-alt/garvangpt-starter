// frontend/src/App.jsx
import React from "react";
import Memories from "./components/Memories.jsx";

export default function App() {
  return (
    <div className="page">
      {/* Hero */}
      <header style={{ marginTop: 32, marginBottom: 24 }}>
        <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: "0 0 8px" }}>
          Almost Human
        </h1>
        <p style={{ fontSize: 18, color: "var(--muted)", margin: "0 0 16px" }}>
          A speaking avatar that learns your preferences and actually remembers.
        </p>

        <div className="controls" style={{ justifyContent: "flex-start" }}>
          <a
            className="button primary"
            href="mailto:hello@yourdomain.com?subject=Almost%20Human%20—%20Early%20Access"
          >
            Get early access
          </a>
          <a
            className="button"
            href="https://garvangpt-frontend.onrender.com"
            target="_self"
            rel="noreferrer"
            style={{ marginLeft: 8 }}
          >
            Try the memory demo
          </a>
        </div>
      </header>

      {/* Divider */}
      <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "28px 0" }} />

      {/* Demo section */}
      <section>
        <h2 style={{ margin: "0 0 12px" }}>Memories</h2>
        <Memories />
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 48, opacity: 0.7 }}>
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
