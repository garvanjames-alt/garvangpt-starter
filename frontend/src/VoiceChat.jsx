// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from 'react';
import { addMemory } from './lib/api';

// --- Simple browser speech helpers (recognition + synthesis) ---
function useSpeech() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState({ rec: false, synth: false });
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported({ rec: !!SR, synth: !!window.speechSynthesis });
    if (SR) {
      const r = new SR();
      r.lang = 'en-US';
      r.interimResults = true;
      r.continuous = false;
      recRef.current = r;
    }
  }, []);

  function start(onChunk, onDone, onErr) {
    const r = recRef.current;
    if (!r) return;
    r.onresult = (e) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      onChunk?.(t);
      if (e.results?.[0]?.isFinal) onDone?.(t);
    };
    r.onerror = (e) => onErr?.(e);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  }

  return { listening, supported, start, stop, speak };
}

export default function VoiceChat() {
  const { listening, supported, start, stop, speak } = useSpeech();
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('idle');
  const [toast, setToast] = useState('');

  function startMic() {
    if (!supported.rec) {
      setToast('SpeechRecognition not supported in this browser.');
      return;
    }
    setInput('');
    start(
      (partial) => setInput(partial),
      (finalText) => {
        setInput(finalText);
        setStatus('idle');
      },
      (err) => {
        setToast(`Mic error: ${err?.error || 'unknown'}`);
        setStatus('idle');
      }
    );
    setStatus('listening');
  }

  function clearTranscript() {
    stop();
    setInput('');
    setReply('');
    setStatus('idle');
  }

  // Current prototype: a friendly echo (so we can verify end-to-end)
  async function sendToPrototype() {
    const msg = input.trim();
    if (!msg) return;
    setStatus('thinking');
    const r = `Sounds like ${msg
      .charAt(0)
      .toLowerCase()}${msg.slice(1)}. Thanks for sharing!`;
    setReply(r);
    setStatus('spoken');
  }

  function playTestVoice() {
    if (!supported.synth) {
      setToast('SpeechSynthesis not supported in this browser.');
      return;
    }
    speak('Hello! This is your test voice.');
  }

  async function saveReplyAsMemory() {
    const text = reply.trim();
    if (!text) {
      setToast('There is no reply to save yet.');
      return;
    }
    try {
      setToast('');
      await addMemory(text);
      setToast('Saved to memories.');
    } catch (e) {
      setToast(`Save failed: ${e?.message || 'unknown error'}`);
    }
  }

  // --- NEW: Speak reply via your Render /tts endpoint (ElevenLabs) ---
  async function speakReplyWithTTS() {
    const text = reply.trim();
    if (!text) {
      setToast('No reply to speak yet.');
      return;
    }
    try {
      setToast('');
      setStatus('tts');
      const r = await fetch(`https://almosthuman-starter.onrender.com/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} ${msg || r.statusText}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      setStatus('spoken');
    } catch (err) {
      setToast(`TTS failed: ${err?.message || 'unknown error'}`);
      setStatus('idle');
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Talk to the prototype</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
        <button onClick={startMic} disabled={listening}>🎙️ Start mic</button>
        <button onClick={clearTranscript}>🧽 Clear transcript</button>
        <button onClick={playTestVoice}>🔈 Play test voice</button>
        <button onClick={sendToPrototype} disabled={!input.trim()}>🫗 Send to prototype</button>
        <button onClick={speakReplyWithTTS} disabled={!reply.trim()}>🔊 Speak reply</button>
        <button onClick={saveReplyAsMemory} disabled={!reply.trim()}>💾 Save reply as memory</button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        SpeechRecognition {supported.rec ? 'OK' : '—'} • SpeechSynthesis {supported.synth ? 'OK' : '—'} • Status: {status}
      </div>

      <textarea
        aria-label="Your transcript"
        placeholder="Your transcript will appear here."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={6}
        style={{ width: '100%', padding: 10, fontFamily: 'inherit' }}
      />

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Prototype reply</div>
        <div
          style={{
            border: '1px solid #ddd',
            padding: 10,
            borderRadius: 6,
            minHeight: 48,
            background: '#fafafa',
          }}
        >
          {reply || <span style={{ opacity: 0.6 }}>No reply yet.</span>}
        </div>
      </div>

      {toast && (
        <div style={{ marginTop: 10, color: toast.includes('failed') ? 'crimson' : 'green' }}>
          {toast}
        </div>
      )}
    </section>
  );
}
