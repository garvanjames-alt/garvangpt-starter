import { useEffect, useRef, useState } from 'react'

// Minimal browser speech-to-text component using Web Speech API.
// Calls props.onFinalText(finalTranscript) when a final result is produced.
export default function VoiceChat({ onFinalText }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recogRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return () => {}

    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = true
    recog.continuous = true

    recog.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      setInterim(interimText)
      if (finalText && typeof onFinalText === 'function') {
        onFinalText(finalText.trim())
      }
    }

    recog.onend = () => {
      setListening(false)
    }

    recog.onerror = () => {
      setListening(false)
    }

    recogRef.current = recog
    return () => {
      try { recog.stop() } catch {}
      recogRef.current = null
    }
  }, [onFinalText])

  function toggle() {
    const recog = recogRef.current
    if (!recog) return alert('Speech Recognition not supported in this browser.')
    if (!listening) {
      try { recog.start(); setListening(true) } catch {}
    } else {
      try { recog.stop(); setListening(false) } catch {}
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button className="px-3 py-2 rounded-lg border" onClick={toggle}>
        {listening ? '■ Stop mic' : '🎤 Start mic'}
      </button>
      {interim && (
        <span className="text-sm opacity-70 max-w-[40ch] truncate" title={interim}>
          {interim}
        </span>
      )}
    </div>
  )
}
