// frontend/src/VoiceChat.jsx
import React, { useState, useRef } from "react";
import { api } from "./lib/api";

// Helper so we don't touch `window` on the server
function createRecognition() {
  if (typeof window === "undefined") return null;
  const SR =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  return SR ? new SR() : null;
}

export default function VoiceChat() {
  const [question, setQuestion] = useState("");
  const [assistant, setAssistant] = useState("");
  const [readAloud, setReadAloud] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q) return;

    setError("");
    setAssistant("Thinking…");

    try {
      const data = await api.respond(q);
      const answer = data.answer || "(no answer returned)";
      setAssistant(answer);

      if (readAloud && answer) {
        try {
          const url = await api.tts(answer);
          if (audioRef.current) {
            audioRef.current.src = url;
            await audioRef.current.play();
          }
        } catch (ttsErr) {
          console.error("TTS error:", ttsErr);
          setError("TTS error: " + (ttsErr.message || String(ttsErr)));
        }
      }
    } catch (err) {
      console.error("respond error:", err);
      setAssistant("");
      setError(err.message || "Request failed");
    }
  }

  function handleStartMic() {
    // If already listening, stop.
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = createRecognition();
    if (!recognition) {
      setError("Your browser does not support speech recognition.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      try {
        const text = event.results[0][0].transcript;
        setQuestion(text);
      } catch (e) {
        console.error("onresult error:", e);
      } finally {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setError("Mic error: " + event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setIsListening(true);
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">
          GarvanGPT — “Almost Human” (Local MVP)
        </h1>
        <p className="text-sm text-gray-300 mt-1">
          Backend at <strong>3001</strong>; Frontend at <strong>5173</strong>.
          API base via Vite proxy or Render static site.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Talk to the prototype</h2>
        <textarea
          className="w-full min-h-[80px] p-2 bg-[#111] text-sm text-white border border-[#444] rounded"
          placeholder="Speak with the mic or type your question here…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartMic}
            className={`px-4 py-1 rounded font-semibold ${
              isListening ? "bg-red-600" : "bg-gray-700"
            }`}
          >
            {isListening ? "Stop mic" : "Start mic"}
          </button>

          <button
            type="button"
            onClick={handleAsk}
            className="px-4 py-1 rounded font-semibold bg-blue-600"
          >
            Send to prototype
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={readAloud}
              onChange={(e) => setReadAloud(e.target.checked)}
            />
            Read aloud
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Assistant</h2>
        <textarea
          className="w-full min-h-[140px] p-2 bg-[#111] text-sm text-white border border-[#444] rounded"
          value={assistant}
          readOnly
          placeholder="The answer will appear here…"
        />
      </section>

      {error && (
        <p className="text-xs text-red-400 mt-1">
          Error: {error}
        </p>
      )}

      <audio ref={audioRef} hidden />
    </main>
  );
}
