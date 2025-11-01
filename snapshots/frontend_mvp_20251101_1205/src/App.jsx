import { useEffect, useRef, useState } from 'react'
import VoiceChat from './VoiceChat'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

export default function App() {
  // Top question box (dev-only)
  const [question, setQuestion] = useState('')
  const [loadingAsk, setLoadingAsk] = useState(false)

  // Prototype section
  const [protoText, setProtoText] = useState('')
  const [assistant, setAssistant] = useState('')
  const [usedMemories, setUsedMemories] = useState([])
  const [loadingProto, setLoadingProto] = useState(false)

  // Optional: simple Web Speech TTS (placeholder for ElevenLabs)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const lastSpokenRef = useRef('')

  useEffect(() => {
    if (!ttsEnabled) return
    if (!assistant || assistant === lastSpokenRef.current) return

    // Try ElevenLabs first; fall back to system voice if not configured
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(`${API_BASE}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: assistant }),
          signal: ctrl.signal,
        })
        if (!r.ok) throw new Error(`TTS HTTP ${r.status}`)
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => URL.revokeObjectURL(url)
        await audio.play()
        lastSpokenRef.current = assistant
        return
      } catch {
        // Fall back to system TTS
        try {
          const utter = new SpeechSynthesisUtterance(assistant)
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utter)
          lastSpokenRef.current = assistant
        } catch {}
      }
    })()

    return () => ctrl.abort()
  }, [assistant, ttsEnabled])

  async function postRespond(message) {
    const res = await fetch(`${API_BASE}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  // Top dev-only ask box
  async function handleAsk() {
    const msg = question?.trim()
    if (!msg) return
    setLoadingAsk(true)
    try {
      const data = await postRespond(msg)
      setAssistant(data?.text ?? '(no reply)')
      setUsedMemories(Array.isArray(data?.usedMemories) ? data.usedMemories : [])
    } catch (e) {
      setAssistant(`(error) ${String(e?.message || e)}`)
    } finally {
      setLoadingAsk(false)
    }
  }

  // Prototype send
  async function handleSendToPrototype() {
    const msg = protoText?.trim()
    if (!msg) return
    setLoadingProto(true)
    try {
      const data = await postRespond(msg)
      setAssistant(data?.text ?? '(no reply)')
      setUsedMemories(Array.isArray(data?.usedMemories) ? data.usedMemories : [])
    } catch (e) {
      setAssistant(`(error) ${String(e?.message || e)}`)
    } finally {
      setLoadingProto(false)
    }
  }

  // Mic callback → append into prototype textarea
  function handleAppendFromMic(t) {
    if (!t) return
    setProtoText((p) => (p ? p + ' ' + t : t))
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>GarvanGPT — “Almost Human” (Local MVP)</h1>
      <p>
        Backend at <b>3001</b>; Frontend at <b>5173</b>. API base:{' '}
        <a href={API_BASE} target="_blank" rel="noreferrer">
          {API_BASE}
        </a>
      </p>

      {/* Dev-only quick ask */}
      <hr />
      <h3>Question (dev-only)</h3>
      <textarea
        placeholder="Type a quick test question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: 8 }}
      />
      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleAsk} disabled={loadingAsk}>
          {loadingAsk ? 'Asking…' : 'Ask'}
        </button>
        <button type="button" onClick={() => setQuestion('')}>
          Clear
        </button>
      </div>

      {/* Prototype section */}
      <hr style={{ marginTop: 16 }} />
      <h3>Talk to the prototype</h3>

      <textarea
        value={protoText}
        onChange={(e) => setProtoText(e.target.value)}
        rows={4}
        placeholder="Speak or type here…"
        style={{ width: '100%', padding: 8 }}
      />

      {/* Controls aligned: Mic + Send + TTS toggle */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <VoiceChat onFinalText={handleAppendFromMic} />
        <button type="button" onClick={handleSendToPrototype} disabled={loadingProto}>
          {loadingProto ? 'Sending…' : 'Send to prototype'}
        </button>

        <label style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          Read assistant reply aloud (placeholder TTS)
        </label>
      </div>

      {/* Assistant reply */}
      <hr style={{ marginTop: 16 }} />
      <h3>Assistant</h3>
      <pre style={{ whiteSpace: 'pre-wrap', padding: 8, border: '1px solid #ddd', minHeight: 96 }}>
        {assistant || '—'}
      </pre>

      {/* Optionally show used memories later */}
      {!!usedMemories?.length && (
        <div style={{ marginTop: 8 }}>
          <b>Used memories:</b>
          <ul>
            {usedMemories.map((m, i) => (
              <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
