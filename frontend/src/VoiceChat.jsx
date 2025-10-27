// frontend/src/VoiceChat.jsx
import React from "react";
import React, { useEffect, useRef, useState } from "react";

const SR =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoiceChat() {
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [note, setNote] = useState("");
  const recogRef = useRef(null);

  // ---------- STT (Mic) ----------
  const startListening = () => {
    if (!SR) {
      setNote("Speech Recognition not supported in this browser. Try Chrome.");
      return;
    }
    const recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = true;
    recog.continuous = true;

    recog.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setTranscript(t.trim());
    };
    recog.onend = () => setListening(false);
    recog.onerror = (e) => setNote(`Mic error: ${e.error || "unknown"}`);

    recogRef.current = recog;
    recog.start();
    setListening(true);
    setNote("");
  };

  const stopListening = () => {
    try {
      recogRef.current?.stop();
    } catch {}
    setListening(false);
  };

  // ---------- TTS (Speak) ----------
  const speak = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setNote("Speech Synthesis not supported in this browser.");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setTalking(true);
      u.onend = () => {
        setTalking(false);
        resolve();
      };
      speechSynthesis.cancel(); // stop anything queued
      speechSynthesis.speak(u);
    });
  };

  const sayHello = () =>
    speak("Hi! I'm the Almost Human demo avatar. Nice to meet you.");

  // ---------- Demo script ----------
  const runDemoScript = async () => {
    const lines = [
      "Hi! I’m Almost Human.",
      "I can listen, speak, and remember things you tell me.",
      "This is a front end demo — the real model is coming next.",
      "If you’d like early access, tap the link at the top.",
    ];
    for (const line of lines) {
      // slight pause between lines to feel natural
      await speak(line);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // ---------- simple inline styles ----------
  const styles = {
    wrap: { marginTop: 48 },
    row: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
    btn: {
      appearance: "none",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "10px 14px",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
    },
    btnPrimary: { background: "var(--accent)", color: "#fff", border: "none" },
    note: { fontSize: 14, color: "var(--muted)" },
    transcript: {
      marginTop: 10,
      padding: 10,
      border: "1px dashed var(--border)",
      borderRadius: 8,
      minHeight: 44,
      fontSize: 14,
      background: "#fff",
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: "50%",
      background:
        "radial-gradient(120px 120px at 50% -40%, #e6f4ff 20%, #cfe9ff 45%, #bfe1ff 70%, #a1d2ff 100%)",
      boxShadow: "0 5px 24px rgba(0,0,0,0.12), inset 0 -6px 16px rgba(0,0,0,0.06)",
      position: "relative",
      display: "grid",
      placeItems: "center",
    },
    eyes: {
      position: "absolute",
      top: 30,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      gap: 18,
    },
    eye: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#0f172a",
      boxShadow: "0 1px 0 #fff inset",
    },
    mouth: {
      width: 36,
      height: 10,
      borderRadius: 8,
      background: "#0f172a",
      transformOrigin: "50% 50%",
      transform: talking ? "scaleY(0.25)" : "scaleY(0.06)",
      transition: "transform 90ms ease",
      position: "absolute",
      bottom: 22,
      left: "50%",
      translate: "-50% 0",
      boxShadow: "0 1px 0 #fff inset",
    },
  };

  return (
    <section id="talk" style={styles.wrap}>
      <h2 style={{ margin: "24px 0 12px" }}>Talk to me</h2>

      <div style={styles.row}>
        {/* Avatar */}
        <div style={styles.avatar} aria-label={talking ? "Speaking" : "Idle"}>
          <div style={styles.eyes}>
            <div style={styles.eye} />
            <div style={styles.eye} />
          </div>
          <div style={styles.mouth} />
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={styles.row}>
            {!listening ? (
              <button
                type="button"
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={startListening}
              >
                🎤 Start mic
              </button>
            ) : (
              <button type="button" style={styles.btn} onClick={stopListening}>
                ⏹ Stop mic
              </button>
            )}

            <button type="button" style={styles.btn} onClick={sayHello}>
              🗣️ Say hello
            </button>

            <button type="button" style={styles.btn} onClick={runDemoScript}>
              🎬 Run demo script
            </button>
          </div>

          {note ? <div style={styles.note}>{note}</div> : null}

          <div style={styles.transcript} aria-live="polite">
            {transcript ? transcript : "Your transcript will appear here."}
          </div>
        </div>
      </div>
    </section>
  );
}
