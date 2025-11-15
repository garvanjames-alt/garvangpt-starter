import React, { useState } from "react";
import { api } from "./lib/api";

function Prototype() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readAloud, setReadAloud] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setAnswer("");
    try {
      const res = await api.respond(trimmed);
      const text = res?.answer || "(no answer returned)";
      setAnswer(text);

      if (readAloud) {
        try {
          await api.tts(text);
        } catch (err) {
          console.error("TTS error:", err);
        }
      }
    } catch (err) {
      console.error(err);
      setAnswer("Sorry, something went wrong talking to the prototype.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mic is still the simple demo from before
  const toggleMic = () => {
    // We keep the label but don't wire full STT here yet
    setIsMicOn((on) => !on);
  };

  return (
    <section id="prototype" className="prototype-section">
      <div className="container">
        <h2 className="section-title">Talk to the prototype</h2>
        <p className="section-subtitle">
          Early beta demo running on a private backend. Answers may not always
          be correct. Always check with your own healthcare professional before
          changing medicines or treatments.
        </p>

        <div className="prototype-card">
          <header className="prototype-header">
            <h3>GarvanGPT — “Almost Human” (Local MVP)</h3>
            <p className="prototype-meta">
              Backend at <strong>3001</strong>; Frontend at <strong>5173</strong
              >. API base via Vite proxy or Render static site.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="prototype-form">
            <label className="input-label" htmlFor="question">
              Talk to the prototype
            </label>
            <textarea
              id="question"
              className="input-textarea"
              placeholder="Speak with the mic or type your question here…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
            />

            <div className="prototype-controls">
              <button
                type="button"
                className={`btn btn-outline ${isMicOn ? "btn-outline-on" : ""}`}
                onClick={toggleMic}
              >
                {isMicOn ? "Stop mic" : "Start mic"}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Thinking…" : "Send to prototype"}
              </button>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={readAloud}
                  onChange={(e) => setReadAloud(e.target.checked)}
                />
                <span>Read aloud</span>
              </label>
            </div>
          </form>

          <div className="answer-block">
            <div className="answer-label">Assistant</div>
            <div className="answer-box">
              {answer ? answer : "The answer will appear here…"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  return (
    <div className="page-root">
      {/* Top bar / logo */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-mark">AH</div>
            <div className="brand-text">
              <div className="brand-name">Almost Human</div>
              <div className="brand-tagline">AI for safe healthcare education</div>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#who-we-are">Who We Are</a>
            <a href="#what-we-do">What We Do</a>
            <a href="#prototype">Try the Prototype</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1>
                Building AI that advances
                <span className="hero-accent"> healthcare access</span>
              </h1>
              <p className="hero-subtitle">
                Improving understanding of medicines and everyday health through
                safe, pharmacist-led AI education.
              </p>

              <div className="hero-card">
                <div className="hero-avatar" aria-hidden="true">
                  🧑‍⚕️
                </div>
                <div>
                  <div className="hero-card-title">
                    GarvanGPT, your virtual pharmacist
                  </div>
                  <p className="hero-card-body">
                    Trained on years of pharmacy experience to explain complex
                    topics in plain language.
                  </p>
                </div>
              </div>

              <p className="hero-disclaimer">
                Ask me anything about your health or medicines.
                <br />
                <strong>
                  This prototype is for education only and doesn&apos;t replace
                  your own doctor, pharmacist or emergency care.
                </strong>
              </p>

              <div className="hero-pills">
                <span className="pill">Redefining patient experience</span>
                <span className="pill">
                  Safety and trust first — guardrails &amp; pharmacist review
                </span>
              </div>
            </div>

            {/* Right-side summary (simple for now) */}
            <div className="hero-side">
              <div className="hero-side-card">
                <h3>What you can try today</h3>
                <ul>
                  <li>Ask medicine questions in plain English.</li>
                  <li>Hear answers read aloud with clear disclaimers.</li>
                  <li>
                    See how pharmacist-written content feels when powered by AI.
                  </li>
                </ul>
                <a href="#prototype" className="btn btn-primary full-width">
                  Scroll to prototype
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section id="who-we-are" className="section">
          <div className="container">
            <h2 className="section-title">Who We Are</h2>
            <p className="section-body">
              Almost Human is an AI healthcare project founded by a pharmacist
              with 20+ years of experience running a community pharmacy. We’re
              building tools that make trustworthy medicine information easier
              to access — starting with a virtual pharmacist that speaks like a
              real person, not a leaflet.
            </p>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section id="what-we-do" className="section section-muted">
          <div className="container">
            <h2 className="section-title">What We Do</h2>
            <div className="grid-2">
              <div>
                <h3 className="section-subheading">Today</h3>
                <ul className="bullet-list">
                  <li>Safe AI health and medicine education.</li>
                  <li>Conversational avatars for patients and professionals.</li>
                  <li>Clear guardrails and safety-first prompts.</li>
                </ul>
              </div>
              <div>
                <h3 className="section-subheading">Tomorrow</h3>
                <ul className="bullet-list">
                  <li>
                    Deeper integrations with pharmacy and primary care systems.
                  </li>
                  <li>Personalised education journeys for long-term conditions.</li>
                  <li>
                    Tools that help clinicians communicate risk in plain
                    language.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PROTOTYPE SECTION */}
        <Prototype />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Almost Human Labs.</span>
          <span className="footer-disclaimer">
            This is an educational prototype and not a medical device.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
