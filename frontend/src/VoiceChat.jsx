// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Mic + transcript + tiny TTS smoke test.
 * - Mic uses Web Speech Recognition if available (Chrome)
 * - TTS uses Web Speech Synthesis (built-in)
 */
export default function VoiceChat() {
  const [readySR, setReadySR] = useState(false);
  const [readyTTS, setReadyTTS] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const recogRef = useRef(null);
  const streamRef = useRef(null);

  // Feature detect once
  useEffect(() => {
    const SR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setReadySR(SR);
    const TTS = typeof window.speechSynthesis !== "undefined";
    setReadyTTS(TTS);
  }, []);

  async function ensureMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      return true;
    } catch (e) {
      setStatus(`mic error: ${e.name}`);
      return false;
    }
  }

  function stopMicStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function start() {
    setStatus("starting…");

    const ok = await ensureMic();
    if (!ok) return;

    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SRClass) {
      const r = new SRClass();
      recogRef.current = r;
      r.lang = "en-US";
      r.continuous = true;
      r.interimResults = true;

      r.onresult = (ev) => {
        let finalText = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const chunk = ev.results[i][0]?.transcript ?? "";
          if (ev.results[i].isFinal) finalText += chunk;
        }
        if (finalText) setTranscript(t => (t ? t + " " : "") + finalText.trim());
      };
      r.onerror = (e) => setStatus(`recognition error: ${e.error}`);
      r.onend = () => {
        setListening(false);
        setStatus("stopped");
        stopMicStream();
      };

      r.start();
      setListening(true);
      setStatus("listening");
    } else {
      setListening(true);
      setStatus("mic active (no speech API)");
    }
  }

  function stop() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
    setStatus("stopped");
    stopMicStream();
  }

  // --- Tiny TTS helpers ------------------------------------------------------

  function speak(text) {
    if (!readyTTS) {
      setStatus("tts not available");
      return;
    }
    // Cancel anything pending and speak fresh
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.onend = () => setStatus("spoken");
    utt.onerror = (e) => setStatus(`tts error: ${e.error || "unknown"}`);
    window.speechSynthesis.speak(utt);
    setStatus("speaking…");
  }

  function speakTest() {
    speak("Hello! Your microphone and speaker test is working.");
  }

  function speakTranscript() {
    const text = transcript.trim();
    speak(text || "There is no transcript yet.");
  }

  // --------------------------------------------------------------------------

  return (
    <section id="voice" className="page" style={{ marginTop: 24 }}>
      <h2>Talk to me</h2>

      <div className="controls" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button onClick={listening ? stop : start} id="startMic">
          {listening ? "Stop mic" : "Start mic"}
        </button>
        <button onClick={() => setTranscript("")} disabled={listening}>
          Clear transcript
        </button>
        <button onClick={speakTest}>
          🔊 Play test voice
        </button>
        <button onClick={speakTranscript} disabled={!readyTTS}>
          🔊 Read transcript
        </button>
      </div>

      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        {readySR ? "SpeechRecognition OK" : "SpeechRecognition not available (Chrome recommended)"} •{" "}
        {readyTTS ? "SpeechSynthesis OK" : "SpeechSynthesis not available"} •{" "}
        Status: {status}
      </div>

      <div
        id="transcript"
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          minHeight: 80,
          background: "#fafafa",
          fontSize: 14
        }}
      >
        {transcript || <span className="muted">Your transcript will appear here.</span>}
      </div>
    </section>
  );
}
