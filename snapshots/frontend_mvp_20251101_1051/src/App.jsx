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
    try {
      const utter = new SpeechSynthesisUtterance(assistant)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
      lastSpokenRef.current = assistant
    } catch {}
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

  async function handleAsk() {
    if (!question.trim()) return
    setLoadingAsk(true)
    try {
      const data = await postRespond(question.trim())
      setAssistant(data?.text || '(no reply)')
      setUsedMemories(Array.isArray(data?.usedMemories) ? data.usedMemories : [])
    } catch (e) {
      setAssistant(`(error) ${String(e.message || e)}`)
    } finally {
      setLoadingAsk(false)
    }
  }

  async function handleSendToPrototype() {
    const msg = protoText?.trim()
    if (!msg) return
    setLoadingProto(true)
    try {
      const data = await postRespond(msg)
      setAssistant(data?.text || '(no reply)')
      setUsedMemories(Array.isArray(data?.usedMemories) ? data.usedMemories : [])
    } catch (e) {
      setAssistant(`(error) ${String(e.message || e)}`)
    } finally {
      setLoadingProto(false)
    }
  }

  function handleAppendFromMic(t) {
    if (!t) return
    setProtoText((p) => (p ? p + ' ' + t : t))
  }

  function handleClearQuestion() {
    setQuestion('')
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto p-4 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">GarvanGPT — “Almost Human” (Local MVP)</h1>
        <p className="text-sm opacity-70">
          Backend at <code>3001</code>; Frontend at <code>5173</code>. API base:{' '}
          <code>{API_BASE}</code>
        </p>
      </header>

      {/* DEV-ONLY ASK BOX */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Question (dev-only)</h2>
        <textarea
          className="w-full border rounded-lg p-3"
          rows={3}
          placeholder="Type a quick test question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={handleAsk}
            disabled={loadingAsk}
          >
            {loadingAsk ? 'Asking…' : 'Ask'}
          </button>
          <button className="px-3 py-2 rounded-lg border" onClick={handleClearQuestion}>
            Clear
          </button>
        </div>
      </section>

      {/* PROTOTYPE TALK SECTION */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Talk to the prototype</h2>
        <textarea
          className="w-full border rounded-lg p-3"
          rows={6}
          placeholder="Speak or type here…"
          value={protoText}
          onChange={(e) => setProtoText(e.target.value)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <VoiceChat onFinalText={handleAppendFromMic} />
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={handleSendToPrototype}
            disabled={loadingProto}
          >
            {loadingProto ? 'Sending…' : 'Send to prototype'}
          </button>
          <label className="flex items-center gap-2 text-sm opacity-80 select-none">
            <input
              type="checkbox"
              checked={ttsEnabled}
              onChange={(e) => setTtsEnabled(e.target.checked)}
            />
            Read assistant reply aloud (placeholder TTS)
          </label>
        </div>
      </section>

      {/* ASSISTANT PANEL */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Assistant</h2>
        <div className="border rounded-lg p-3 whitespace-pre-wrap min-h-[88px]">
          {assistant || '—'}
        </div>
        {!!usedMemories?.length && (
          <div className="text-sm opacity-80">
            <div className="font-medium mb-1">Used Memories</div>
            <ul className="list-disc ml-5 space-y-1">
              {usedMemories.map((m, i) => (
                <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
