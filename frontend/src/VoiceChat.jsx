// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef } from "react";

export default function VoiceChat({ text }) {
  const audioRef = useRef(null);
  const lastSpokenRef = useRef("");

  useEffect(() => {
    const t = (text || "").trim();
    if (!t) return;
    if (t === lastSpokenRef.current) return; // avoid repeats on re-render
    lastSpokenRef.current = t;

    let cancelled = false;
    const controller = new AbortController();

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

      audio.src = url;
      await audio.play();
      return true;
    }

    function playFallbackSpeech() {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-AU";

      // pick an AU voice if available
      const voices = window.speechSynthesis.getVoices();
      const au = voices.find(v => /en-au/i.test(v.lang)) || voices.find(v => /english/i.test(v.lang));
      if (au) u.voice = au;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }

    (async () => {
      try {
        const ok = await playElevenLabs();
        if (!ok) playFallbackSpeech();
      } catch (e) {
        // if ElevenLabs fails, fallback to browser speech
        playFallbackSpeech();
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [text]);

  return <audio ref={audioRef} style={{ display: "none" }} />;
}
