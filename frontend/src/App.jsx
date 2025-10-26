// frontend/src/App.jsx
import React from 'react';
import './content.css';

// DEMO list
import Memories from './components/Memories.jsx';

// Voice prototype
import VoiceChat from './VoiceChat.jsx';

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
          <a
            href="mailto:garvanjames@gmail.com?subject=Almost%20Human%20early%20access&body=Hi%20Garvan%2C%20I%27d%20like%20early%20access."
            style={{ fontWeight: 600 }}
          >
            Get early access
          </a>

          <a href="#memories" style={{ marginLeft: 16 }}>
            Try the memory demo
          </a>

          <a href="#voice" style={{ marginLeft: 16 }}>
            Talk to the prototype
          </a>
        </div>
      </header>

      <hr />

      {/* ---- Memory demo ---- */}
      <section id="memories" className="page">
        <h2>Memories</h2>
        <Memories />
      </section>

      <hr />

      {/* ---- Voice prototype ---- */}
      <section id="voice" className="page">
        <h2>Talk to the prototype</h2>
        <VoiceChat />
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ marginTop: 48, opacity: 0.7 }}>
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
