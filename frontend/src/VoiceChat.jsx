import React, { useEffect, useRef, useState } from "react";
import { api } from "./lib/api";

// Simple voice chat component:
// - "Start mic" uses Web Speech API to capture speech -> text
// - "Send to prototype" sends text to backend via api.respond()
// - If "Read aloud" is checked, we call api.ttsUrl() and play audio

const hasBrowserSpeech =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function VoiceChat() {
  const [input, setInput] = useState("");
  const [assistant, setAssistant] = useState("");
  const [listening, setListening] = useState(false);
  const [readAloud, setReadAloud] = useState(true);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  // Set up speech recognition if available
  useEffect(() => {
    if (!hasBrowserSpeech) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setListening(true);
      setError("");
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setError("Mic error: " + (event.error || "unknown"));
      setListening(false);
    };

    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput((prev) =>
        prev ? prev + " " + transcript.trim() : transcript.trim()
      );
    };

    recognitionRef.current = rec;

    return () => {
      rec.onstart = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      rec.stop();
    };
  }, []);

  const handleStartMic = () => {
    if (!recognitionRef.current) {
      setError("Your browser doesn't support voice input here.");
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      // start() will throw if it's already running; ignore
      console.warn("SpeechRecognition start error:", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setError("");
    setAssistant("Thinking…");

    try {
      const answer = await api.respond(input.trim());
      setAssistant(answer || "");

      if (readAloud && answer) {
        // Ask backend for TTS audio
        const url = await api.ttsUrl(answer);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch((e) => {
            console.warn("Audio play error:", e);
          });
        }
      }
    } catch (err) {
      console.error("VoiceChat send error:", err);
      setAssistant("");
      setError(
        err instanceof Error
          ? err.message || "Request failed"
          : "Request failed"
      );
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-lg">Talk to the prototype</h3>

      <textarea
        className="w-full min-h-[80px] p-2 bg-[#222] text-sm text-white border border-[#444] rounded"
        placeholder="Speak or type here…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleStartMic}
          disabled={!hasBrowserSpeech}
          className="px-3 py-1 text-sm rounded bg-[#333] border border-[#555]"
        >
          {listening ? "Listening…" : "Start mic"}
        </button>

        <button
          type="button"
          onClick={handleSend}
          className="px-3 py-1 text-sm rounded bg-[#0b5] text-black font-semibold"
        >
          Send to prototype
        </button>

        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(e) => setReadAloud(e.target.checked)}
          />
          Read aloud
        </label>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-lg mb-1">Assistant</h3>
        <textarea
          className="w-full min-h-[120px] p-2 bg-[#111] text-sm text-white border border-[#444] rounded"
          value={assistant}
          readOnly
          placeholder="The answer will appear here…"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1">
          Error: {error}
        </p>
      )}

      <audio ref={audioRef} hidden />
    </section>
  );
}
