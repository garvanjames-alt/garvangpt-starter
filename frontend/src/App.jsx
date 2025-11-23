import React, { useState, useRef } from "react";
import { api } from "./lib/api";

// Decide which backend to talk to for TTS (local vs Render)
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://almosthuman-starter-staging.onrender.com";

function App() {
  // Chat state
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readAloud, setReadAloud] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);

  // Refs for in‑page nav
  const headerRef = useRef(null);
  const healthRef = useRef(null);
  const medicineRef = useRef(null);
  const whoRef = useRef(null);
  const whatRef = useRef(null);
  const journeyRef = useRef(null);
  const prototypeRef = useRef(null);

  const recognitionRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const res = await api.respond(prompt.trim());
      const text = res?.answer || res?.message || "(no answer returned)";
      setAnswer(text);

      // Clear any previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      if (readAloud && text && text !== "(no answer returned)") {
        try {
          // Call TTS directly against the correct backend base URL
          const ttsRes = await fetch(`${API_BASE_URL}/api/tts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          });

          if (!ttsRes.ok) {
            console.error(
              "TTS request failed",
              ttsRes.status,
              ttsRes.statusText
            );
            return;
          }

          const blob = await ttsRes.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                  // Ignore autoplay errors
                });
            }
          }, 0);
        } catch (err) {
          console.error("TTS error", err);
        }
      } else {
        setAudioUrl(null);
      }
    } catch (err) {
      console.error(err);
      setAnswer("Sorry, there was a problem talking to the prototype.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMic = () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (text) setPrompt(text);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Smooth scroll to the *start* of the section, accounting for sticky header
  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    const headerH = headerRef.current?.offsetHeight || 72;
    const y = ref.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, y - headerH - 12), behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        color: "#111827",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      {/* Top navigation */}
      <header
        ref={headerRef}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(10px)",
          background: "rgba(244, 246, 251, 0.9)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Brand badge with your face */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "999px",
                border: "2px solid #0f766e",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "white",
                flexShrink: 0,
              }}
              title="Almost Human"
            >
              <img
                src="/avatar-garvan.png"
                alt="Garvan avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Almost Human</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                AI for safe healthcare education
              </div>
            </div>
          </div>

          <nav
            style={{
              display: "flex",
              gap: 12,
              fontSize: 14,
              color: "#111827",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => scrollToSection(healthRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Health A–Z
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(medicineRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Medicine A–Z
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(whoRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Who We Are
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(whatRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              What We Do
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(journeyRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              My Journey
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(prototypeRef)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Talk to prototype
            </button>
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "28px 20px 72px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {/* Support section */}
        <section
          aria-label="Support Almost Human"
          style={{
            background: "#eef2ff",
            borderRadius: 16,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            border: "1px solid rgba(79, 70, 229, 0.14)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span role="img" aria-label="heart">
              💚
            </span>
            Support Almost Human
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#4b5563",
            }}
          >
            Help support the development of pharmacist-led AI healthcare tools.
          </p>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}
          >
            <a
              href="https://buy.stripe.com/cNi6oHdjjaX5bii5kA67S00"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "#4f46e5",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Support via Stripe
            </a>
            <a
              href="https://paypal.me/AlmostHumanLabs"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(15, 23, 42, 0.14)",
                background: "white",
                color: "#111827",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Support via PayPal
            </a>
          </div>
        </section>

        {/* Hero section */}
        <section
          aria-labelledby="hero-heading"
          style={{
            background:
              "radial-gradient(circle at top left, #e0f2fe, #eef2ff 40%, #f4f4ff)",
            borderRadius: 24,
            padding: "28px 24px 24px 24px",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <p
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: 11,
                fontWeight: 600,
                color: "#4b5563",
                margin: 0,
                marginBottom: 10,
              }}
            >
              AI for safe healthcare education
            </p>
            <h1
              id="hero-heading"
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.15,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Building AI that advances
              <br />
              <span style={{ color: "#0f766e" }}>healthcare access</span>
            </h1>
            <p
              style={{
                marginTop: 14,
                marginBottom: 18,
                fontSize: 15,
                color: "#4b5563",
                maxWidth: 540,
              }}
            >
              Improving understanding of medicines and everyday health through
              safe, pharmacist-led AI education.
            </p>
          </div>

          {/* GarvanGPT card */}
          <div
            style={{
              marginTop: 18,
              background: "white",
              borderRadius: 16,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid rgba(148, 163, 184, 0.4)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "999px",
                border: "2px solid #0f766e",
                overflow: "hidden",
                flexShrink: 0,
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="/avatar-garvan.png"
                alt="Garvan avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                GarvanGPT, your virtual pharmacist
              </div>
              <div style={{ fontSize: 13, color: "#4b5563" }}>
                Trained on years of pharmacy experience to explain complex
                topics in plain language.
              </div>
            </div>
          </div>

          <p
            style={{
              marginTop: 16,
              marginBottom: 8,
              fontSize: 14,
              color: "#4b5563",
              maxWidth: 620,
            }}
          >
            Ask me anything about your health or medicines. This prototype is
            for education only and doesn't replace your own doctor, pharmacist
            or emergency care.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(22, 163, 74, 0.08)",
                color: "#166534",
                border: "1px solid rgba(22, 163, 74, 0.25)",
              }}
            >
              Redefining patient experience
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(59, 130, 246, 0.08)",
                color: "#1d4ed8",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              Safety and trust first — guardrails & pharmacist review
            </span>
          </div>

          {/* What you can try today */}
          <div
            style={{
              marginTop: 22,
              background: "white",
              borderRadius: 16,
              padding: "16px 18px",
              border: "1px solid rgba(148, 163, 184, 0.45)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              What you can try today
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              <li>Ask medicine questions in plain English.</li>
              <li>Hear answers read aloud with clear disclaimers.</li>
              <li>
                See how pharmacist-written content feels when powered by AI.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => scrollToSection(prototypeRef)}
              style={{
                marginTop: 12,
                padding: "9px 16px",
                borderRadius: 999,
                border: "none",
                background: "#4f46e5",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Scroll to prototype
            </button>
          </div>
        </section>

        {/* Health A–Z placeholder */}
        <section ref={healthRef} aria-labelledby="health-heading">
          <h2
            id="health-heading"
            style={{ fontSize: 22, marginBottom: 10, marginTop: 0 }}
          >
            Health A–Z
          </h2>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: "14px 16px",
              border: "1px solid rgba(148, 163, 184, 0.4)",
              fontSize: 15,
              color: "#4b5563",
            }}
          >
            Coming soon. This section will contain pharmacist‑written health
            explainers and safety notes.
          </div>
        </section>

        {/* Medicine A–Z placeholder */}
        <section ref={medicineRef} aria-labelledby="medicine-heading">
          <h2
            id="medicine-heading"
            style={{ fontSize: 22, marginBottom: 10, marginTop: 0 }}
          >
            Medicine A–Z
          </h2>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: "14px 16px",
              border: "1px solid rgba(148, 163, 184, 0.4)",
              fontSize: 15,
              color: "#4b5563",
            }}
          >
            Coming soon. This section will contain pharmacist‑written medicine
            explainers and safety notes.
          </div>
        </section>

        {/* Who we are / What we do */}
        <section ref={whoRef} aria-labelledby="who-heading">
          <h2
            id="who-heading"
            style={{ fontSize: 22, marginBottom: 10, marginTop: 0 }}
          >
            Who We Are
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: "#4b5563",
              maxWidth: 720,
            }}
          >
            Almost Human is an AI healthcare project founded by a pharmacist
            with 20+ years of experience running a community pharmacy. We're
            building tools that make trustworthy medicine information easier to
            access — starting with a virtual pharmacist that speaks like a real
            person, not a leaflet.
          </p>
        </section>

        <section ref={whatRef} aria-labelledby="what-heading">
          <h2
            id="what-heading"
            style={{ fontSize: 22, marginBottom: 12, marginTop: 0 }}
          >
            What We Do
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "14px 16px",
                border: "1px solid rgba(148, 163, 184, 0.4)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Today
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                <li>Safe AI health and medicine education.</li>
                <li>Conversational avatars for patients and professionals.</li>
                <li>Clear guardrails and safety-first prompts.</li>
              </ul>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "14px 16px",
                border: "1px solid rgba(148, 163, 184, 0.4)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Tomorrow
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                <li>Deeper integrations with pharmacy and primary care.</li>
                <li>Personalised education for long‑term conditions.</li>
                <li>Risk communication tools in plain language.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Journey / video section */}
        <section ref={journeyRef} aria-labelledby="journey-heading">
          <h2
            id="journey-heading"
            style={{ fontSize: 22, marginBottom: 10, marginTop: 0 }}
          >
            My Journey
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
              gap: 18,
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 15,
                color: "#4b5563",
              }}
            >
              I built my first health website over 20 years ago, writing
              pharmacist-created content to help people understand their
              medicines. Almost Human is the next step — turning that experience
              into AI tools that speak clearly, stay grounded in real-world
              pharmacy practice, and always put safety first.
            </p>

            <div
              style={{
                background: "#111827",
                borderRadius: 20,
                padding: 12,
                boxShadow: "0 18px 35px rgba(15, 23, 42, 0.5)",
                color: "white",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 16,
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at top, #4f46e5, #0f172a 55%)",
                  paddingTop: "56.25%",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "999px",
                      border: "none",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "default",
                    }}
                  >
                    <span
                      style={{
                        marginLeft: 3,
                        borderStyle: "solid",
                        borderWidth: "9px 0 9px 16px",
                        borderColor:
                          "transparent transparent transparent #4f46e5",
                      }}
                    />
                  </button>
                  <div
                    style={{
                      fontSize: 13,
                      opacity: 0.9,
                      textAlign: "center",
                      maxWidth: 220,
                    }}
                  >
                    Coming soon: a short film about the Almost Human journey.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prototype section */}
        <section ref={prototypeRef} aria-labelledby="prototype-heading">
          <h2
            id="prototype-heading"
            style={{ fontSize: 22, marginBottom: 4, marginTop: 0 }}
          >
            Talk to the prototype
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: 14,
              fontSize: 14,
              color: "#4b5563",
            }}
          >
            Early beta demo running on a private backend. Answers may not always
            be correct. Always check with your own healthcare professional
            before changing medicines or treatments.
          </p>

          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: "18px 18px 16px 18px",
              boxShadow: "0 18px 35px rgba(15, 23, 42, 0.18)",
              border: "1px solid rgba(148, 163, 184, 0.4)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 6,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              GarvanGPT — "Almost Human" (Local MVP)
            </h3>
            <p
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Backend at <strong>3001</strong>; Frontend at <strong>5173</strong>.
              API base via Vite proxy or Render static site.
            </p>

            {/* Chat UI */}
            <form onSubmit={handleSubmit} style={{ marginBottom: 10 }}>
              <label
                htmlFor="prompt"
                style={{ display: "block", fontSize: 14, marginBottom: 6 }}
              >
                Talk to the prototype
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Speak with the mic or type your question here…"
                rows={3}
                style={{
                  width: "100%",
                  resize: "vertical",
                  borderRadius: 12,
                  border: "1px solid rgba(148, 163, 184, 0.9)",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleStartMic}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148, 163, 184, 0.9)",
                    background: "white",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Start mic
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    background: isLoading ? "#9ca3af" : "#4f46e5",
                    color: "white",
                    fontSize: 13,
                    cursor: isLoading ? "default" : "pointer",
                  }}
                >
                  {isLoading ? "Sending…" : "Send to prototype"}
                </button>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    color: "#4b5563",
                    marginLeft: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={readAloud}
                    onChange={(e) => setReadAloud(e.target.checked)}
                  />
                  Read aloud
                </label>
              </div>
            </form>

            <div>
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Assistant
              </h4>
              <div
                style={{
                  minHeight: 96,
                  borderRadius: 12,
                  border: "1px solid rgba(148, 163, 184, 0.9)",
                  padding: "10px 12px",
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                  background: "#f9fafb",
                }}
              >
                {answer || "The answer will appear here…"}
              </div>

              {audioUrl && (
                <div style={{ marginTop: 8 }}>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    controls
                    style={{ width: "100%" }}
                  />
                  {isPlaying && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      Playing answer aloud…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          padding: "14px 20px 20px 20px",
          fontSize: 12,
          color: "#6b7280",
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>© 2025 Almost Human Labs.</div>

            {/* Footer links */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <a
                href="/privacy.html"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                Privacy
              </a>
              <a
                href="/terms.html"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                Terms
              </a>
              <a
                href="/disclaimer.html"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                Disclaimer
              </a>
              <a
                href="mailto:garvanjames@gmail.com"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                Contact
              </a>

              {/* Visible social media links */}
              <span style={{ color: "rgba(107,114,128,0.8)" }}>•</span>
              <a
                href="https://x.com/AlmostHumanLabs"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                X
              </a>
              <a
                href="https://www.instagram.com/almost.human.lab"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@almost_human_labs"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "#4b5563" }}
              >
                TikTok
              </a>
            </div>
          </div>

          <div>
            This is an educational prototype only — not a substitute for
            professional medical advice.
          </div>
          <div>Prototype codename: GarvanGPT · v0.8</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
