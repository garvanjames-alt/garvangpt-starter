// frontend/src/App.jsx
import React from "react";
import Memories from "./components/Memories.jsx";

export default function App() {
  return (
    <div className="page">
      {/* ---- Hero ---- */}
      <header style={{ margin: "0 0 28px" }}>
        <h1 style={{ margin: "0 0 8px" }}>Almost Human</h1>
        <p style={{ margin: "0 0 16px", maxWidth: 680 }}>
          A speaking avatar that learns your preferences and actually remembers.
        </p>

        <div className="controls" style={{ justifyContent: "flex-start" }}>
          {/* TODO: replace you@example.com with your real inbox */}
          <a
            href="mailto:garvanjames@gmail.com?subject=Almost%20Human%20early%20access&body=Hi%20Garvan,%20I%E2%80%99d%20like%20early%20access."
            style={{ fontWeight: 600 }}
          >
            Get early access
          </a>

          <a href="#memories" style={{ marginLeft: 16 }}>
            Try the memory demo
          </a>
        </div>

        <hr style={{ margin: "24px 0" }} />
      </header>

      {/* ---- Demo (kept simple on purpose) ---- */}
      <section id="memories" style={{ marginTop: 40 }}>
        <h2 style={{ margin: "0 0 12px" }}>Memories</h2>
        <Memories />
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ marginTop: 48, opacity: 0.7 }}>
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
