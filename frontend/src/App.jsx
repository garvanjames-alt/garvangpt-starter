// frontend/src/App.jsx
import React from 'react';
import Memories from './components/Memories.jsx';

export default function App() {
  function scrollToDemo() {
    const el = document.getElementById('try');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Almost Human</h1>
        <p className="tagline">A conversational agent that remembers you.</p>

        <div className="controls">
          <button className="primary" onClick={scrollToDemo}>Try the demo</button>
          <a href="mailto:hello@example.com">
            <button>Contact</button>
          </a>
        </div>
      </header>

      <section id="try" style={{ marginTop: 24 }}>
        <h2>Memories</h2>
        <Memories />
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>What it is</h2>
        <ul className="memories" style={{ listStyle: 'disc', paddingLeft: 24 }}>
          <li>Fast, lightweight starter running on Render (frontend + backend).</li>
          <li>Memory-enabled demo to prove round-trip API + UI.</li>
          <li>Ready to expand into a one-page launch with an avatar.</li>
        </ul>
      </section>

      <footer style={{ marginTop: 48, opacity: 0.7 }}>
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
