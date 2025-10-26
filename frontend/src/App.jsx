// frontend/src/App.jsx
import React from "react";
import Memories from "./components/Memories.jsx";

export default function App() {
  const scrollToMemories = () => {
    document.getElementById("memories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="page">
      {/* Hero */}
      <section>
        <h1>Almost Human</h1>
        <p>A speaking avatar that learns your preferences and actually remembers.</p>

        <div className="controls" style={{ justifyContent: "flex-start" }}>
          <a
            className="button primary"
            href="mailto:hello@almosthuman.ai?subject=Almost%20Human%20Waitlist&body=Hi%20Garvan%2C%0A%0APlease%20add%20me%20to%20the%20Almost%20Human%20early%20access%20waitlist.%0A"
          >
            Get early access
          </a>
          <button className="button" onClick={scrollToMemories}>
            Try the memory demo
          </button>
        </div>
      </section>

      {/* Demo (no extra heading here to avoid duplicates) */}
      <section id="memories" style={{ marginTop: 40 }}>
        <Memories />
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 48, opacity: 0.7 }}>
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
