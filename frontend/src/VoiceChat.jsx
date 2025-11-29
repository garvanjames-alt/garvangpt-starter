// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * VoiceChat (STT + optional TTS)
 * Props:
 *  - autoStart?: boolean           // start listening immediately when mounted
 *  - disabled?: boolean           // disable mic controls while sending
 *  - onFinalText?: (text)=>void   // called with final transcript
 *  - speakText?: string           // latest assistant text to speak aloud
 *
 * Behavior:
 *  - Uses browser SpeechRecognition for mic (no external deps).
 *  - If SpeechRecognition not available, shows a friendly message.
 *  - Speaks speakText using ElevenLabs if env vars exist, else speechSynthesis.
 */
export default function VoiceChat({
  autoStart = false,
  disabled = false,
  onFinalText,
  speakText = "",
}) {
  // -------- Speech-to-text (mic) --------
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const recRef = useRef(null);

  const [supported, setSupported] = useState(Boolean(Recognition));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Recognition) {
      setSupported(false);
      return;
    }

    const rec = new Recognition();
    rec.lang = "en-AU";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      let interimStr = "";
      let finalStr = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalStr += text;
        else interimStr += text;
      }

      if (interimStr) setInterim(interimStr.trim());
      if (finalStr) {
        const cleaned = finalStr.trim();
        setFinalText(cleaned);
        setInterim("");
        setListening(false);
        rec.stop();
        onFinalText?.(cleaned);
      }
    };

    rec.onerror = (e) => {
      setError(e?.error || "Voice error");
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recRef.current = rec;

    if (autoStart && !disabled) {
      try {
        rec.start();
        setListening(true);
        setError("");
        setFinalText("");
        setInterim("");
      } catch (err) {
        setError("Couldn’t start mic. Try clicking Start mic.");
      }
    }

    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [Recognition, autoStart, disabled, onFinalText]);

  function start() {
    if (!recRef.current || listening || disabled) return;
    try {
      recRef.current.start();
      setListening(true);
      setError("");
      setFinalText("");
      setInterim("");
    } catch (err) {
      setError("Mic blocked by browser. Allow microphone access.");
    }
  }

  function stop() {
    if (!recRef.current || !listening) return;
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
  }

  // -------- Text-to-speech (assistant speak) --------
  const audioRef = useRef(null);
  const lastSpokenRef = useRef("");
  const pendingPlayRef = useRef(null);

  useEffect(() => {
    const t = (speakText || "").trim();
    if (!t) return;
    if (t === lastSpokenRef.current) return;
    lastSpokenRef.current = t;

    let cancelled = false;
    const controller = new AbortController();

    function attachGestureOnce(run) {
      pendingPlayRef.current = run;
      const handler = () => {
        const fn = pendingPlayRef.current;
        pendingPlayRef.current = null;
        window.removeEventListener("click", handler);
        window.removeEventListener("keydown", handler);
        if (fn) fn();
      };
      window.addEventListener("click", handler, { once: true });
      window.addEventListener("keydown", handler, { once: true });
    }

    async function safeAudioPlay(audioEl) {
      try {
        await audioEl.play();
        return true;
      } catch (err) {
        const msg = String(err?.name || err?.message || "");
        if (/NotAllowedError|gesture|play\(\)/i.test(msg)) {
          attachGestureOnce(() => {
            if (!cancelled) audioEl.play().catch(() => {});
          });
          return true;
        }
        throw err;
      }
    }

    async function playElevenLabs() {
      const key = import.meta.env.VITE_ELEVENLABS_KEY;
      const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
      if (!key || !voiceId) return false;

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: t,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.45, similarity_boost: 0.8 },
          }),
        }
      );

      if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`);
      const blob = await res.blob();
      if (cancelled) return true;

      const url = URL.createObjectURL(blob);
      const audio = audioRef.current;
      if (!audio) return true;

      try {
        if (audio.src) URL.revokeObjectURL(audio.src);
      } catch {}

      audio.src = url;
      await safeAudioPlay(audio);
      return true;
    }

    function playFallbackSpeech() {
      if (!window.speechSynthesis) return;

      const speak = () => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = "en-AU";
        const voices = window.speechSynthesis.getVoices();
        const au =
          voices.find((v) => /en-au/i.test(v.lang)) ||
          voices.find((v) => /english/i.test(v.lang));
        if (au) u.voice = au;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      };

      try {
        speak();
      } catch (err) {
        const msg = String(err?.name || err?.message || "");
        if (/NotAllowedError|gesture/i.test(msg)) {
          attachGestureOnce(() => !cancelled && speak());
        }
      }
    }

    (async () => {
      try {
        const ok = await playElevenLabs();
        if (!ok) playFallbackSpeech();
      } catch {
        playFallbackSpeech();
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [speakText]);

  // -------- UI --------
  if (!supported) {
    return (
      <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-3">
        Voice input isn’t available in this browser. Try Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        {!listening ? (
          <button
            onClick={start}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            Start mic
          </button>
        ) : (
          <button
            onClick={stop}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm font-semibold"
          >
            Stop mic
          </button>
        )}
        <span className="text-xs text-slate-500">
          {listening ? "Listening…" : disabled ? "Disabled while sending" : "Ready"}
        </span>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}

      {(interim || finalText) && (
        <div className="text-sm text-slate-800">
          <div className="opacity-70">{interim}</div>
          <div className="font-medium">{finalText}</div>
        </div>
      )}

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}
