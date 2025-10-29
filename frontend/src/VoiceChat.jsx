// frontend/src/VoiceChat.jsx
// Minimal mic UI using the Web Speech API + TTS.
// Shows live transcript, sends to backend via sendPrompt, and speaks the reply.

import React, { useEffect, useRef, useState } from "react";
import { sendPrompt, tryCall } from "./lib/api"; // <-- fixed path

export default function VoiceChat() {
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef(null);

  // Capability detection
  useEffect(() => {
    const stt =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    const tts = "speechSynthesis" in window;
    setSupported({ stt, tts });
  }, []);

  // Create recognizer on demand
  function ensureRecognizer() {
    if (recRef.current) return recRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
    return r;
  }

  function start() {
    if (!supported.stt) return;
    const r = ensureRecognizer();
    if (!r) return;
    setTranscript("");
    setReply("");
    setListening(true);
    r.start();
  }

  function stop() {
    const r = recRef.current;
    if (r) r.stop();
    setListening(false);
  }

  async function send() {
    const text = transcript.trim();
    if (!text) return;
    const res = await tryCall(sendPrompt, text);
    if (res.ok) {
      const ans = res.data.text || "";
      setReply(ans);
      speak(ans);
    } else {
      setReply(`Error: ${res.error}`);
    }
  }

  function speak(text) {
    if (!supported.tts) return;
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-3">
      <h2 className="text-lg font-medium">Talk to the prototype</h2>

      <div className="flex items-center gap-2">
        <button
          onClick={start}
          disabled={!supported.stt || listening}
          className="rounded-xl px-3 py-2 border hover:bg-gray-50 disabled:opacity-50"
        >
          {listening ? "Listening…" : "Start mic"}
        </button>
        <button
          onClick={stop}
          disabled={!listening}
          className="rounded-xl px-3 py-2 border hover:bg-gray-50 disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={send}
          disabled={!transcript.trim()}
          className="rounded-xl px-3 py-2 bg-black text-white disabled:opacity-50"
        >
          Send to prototype
        </button>
      </div>

      <div className="text-xs text-gray-600">
        SpeechRecognition {supported.stt ? "OK" : "Unavailable"} ·
        {" "}SpeechSynthesis {supported.tts ? "OK" : "Unavailable"}
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Transcript</div>
        <textarea
          className="w-full border rounded-xl p-2 min-h-[96px]"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your transcript will appear here."
        />
      </div>

      <div className="border rounded-xl p-3 bg-gray-50">
        <div className="text-xs font-medium text-gray-500 mb-1">Prototype reply</div>
        <div className="text-sm whitespace-pre-wrap min-h-[1.5rem]">
          {reply || "—"}
        </div>
      </div>
    </section>
  );
}
