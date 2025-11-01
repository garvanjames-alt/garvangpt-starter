import { useEffect, useRef, useState } from 'react'

/**
 * Simple Web Speech API mic.
 * - Click once to start, again to stop.
 * - On final result it calls props.onFinalText(finalTranscript)
 */
export default function VoiceChat({ onFinalText }) {
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)
  const finalRef = useRef('')

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      console.warn('SpeechRecognition not supported in this browser.')
      return
    }
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'

    recog.onresult = (e) => {
      let interim = ''
      let final = finalRef.current
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) final += chunk
        else interim += chunk
      }
      finalRef.current = final
      // (optional) you could show interim somewhere if desired
    }

    recog.onend = () => {
      // When user stops, emit the final transcript once
      if (finalRef.current && typeof onFinalText === 'function') {
        const text = finalRef.current.trim()
        if (text) onFinalText(text)
      }
      finalRef.current = ''
      setListening(false)
    }

    recog.onerror = () => {
      setListening(false)
    }

    recogRef.current = recog
    return () => {
      try {
        recog.stop()
      } catch {}
      recogRef.current = null
    }
  }, [onFinalText])

  function toggle() {
    const recog = recogRef.current
    if (!recog) return
    if (!listening) {
      finalRef.current = ''
      try {
        recog.start()
        setListening(true)
      } catch {}
    } else {
      try {
        recog.stop()
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm ${
        listening
          ? 'border-red-300 bg-red-50 hover:bg-red-100'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
      title={listening ? 'Stop mic' : 'Start mic'}
    >
      {listening ? '⏹ Stop mic' : '🎙️ Start mic'}
    </button>
  )
}
