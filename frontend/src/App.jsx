import { useEffect, useMemo, useState } from 'react'

// --- Config ---------------------------------------------------------------
// You can also set VITE_API_BASE in .env; we fall back to localhost:3001.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const SESSION_STORAGE_KEY = 'gpt_starter_session'

// Generate a short, readable web-* session id
function newWebSessionId() {
  const rand = () => Math.random().toString(36).slice(2, 6)
  return `web-${rand()}${rand().slice(0, 2)}`
}

// Small helper for JSON fetch with common headers
async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`${res.status} ${res.statusText} — ${text}`)
    err.status = res.status
    err.body = text
    throw err
  }
  return res.json()
}

export default function App() {
  // ---- State -------------------------------------------------------------
  const [sessionId, setSessionId] = useState('')
  const [health, setHealth] = useState('unknown') // 'unknown' | 'ok' | 'down'
  const [memoryItems, setMemoryItems] = useState([])
  const [memoryCount, setMemoryCount] = useState(0)

  // Add-memory form
  const [newItem, setNewItem] = useState('')
  const [newType, setNewType] = useState('fact') // 'fact' | 'answer'
  const [saving, setSaving] = useState(false)

  // Ask box
  const [askText, setAskText] = useState('')
  const [messages, setMessages] = useState([]) // {role:'user'|'assistant'|'error', text}
  const [loadingAnswer, setLoadingAnswer] = useState(false)

  // UI error line (non-fatal)
  const [uiError, setUiError] = useState('')

  // ---- Init sticky session ----------------------------------------------
  useEffect(() => {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!sid) {
      sid = newWebSessionId()
      localStorage.setItem(SESSION_STORAGE_KEY, sid)
    }
    setSessionId(sid)
  }, [])

  // When session changes, do a quick health check + load memory
  useEffect(() => {
    if (!sessionId) return
    checkHealth()
    loadMemory()
  }, [sessionId])

  // ---- Actions -----------------------------------------------------------
  async function checkHealth() {
    try {
      const data = await jfetch(`${API_BASE}/health`)
      setHealth(data?.ok ? 'ok' : 'down')
    } catch {
      setHealth('down')
    }
  }

  async function loadMemory() {
    setUiError('')
    try {
      // Pull list
      const list = await jfetch(`${API_BASE}/memory/list`, {
        headers: { 'X-Session-ID': sessionId },
      })
      setMemoryItems(Array.isArray(list.items) ? list.items : [])

      // Pull count (optional nicety)
      try {
        const status = await jfetch(`${API_BASE}/memory/status`, {
          headers: { 'X-Session-ID': sessionId },
        })
        setMemoryCount(status?.count ?? list.items?.length ?? 0)
      } catch {
        setMemoryCount(list.items?.length ?? 0)
      }
    } catch (e) {
      setUiError(`Failed to load memory: ${e.message}`)
    }
  }

  async function saveMemoryItem() {
    const text = newItem.trim()
    if (!text || saving) return
    setSaving(true)
    setUiError('')
    try {
      await jfetch(`${API_BASE}/memory/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({ type: newType, text }),
      })
      setNewItem('')
      await loadMemory()
    } catch (e) {
      setUiError(`Failed to save memory: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  function resetSession() {
    const id = newWebSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, id)
    setSessionId(id)
    setMessages([])
    setMemoryItems([])
    setMemoryCount(0)
    setUiError('')
  }

  async function ask() {
    const q = askText.trim()
    if (!q || loadingAnswer) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setAskText('')
    setLoadingAnswer(true)
    setUiError('')

    try {
      // If your backend doesn’t have /ask yet, this will 404 — that’s OK.
      const data = await jfetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({ question: q }),
      })
      const answer = data.answer ?? data.text ?? JSON.stringify(data)
      setMessages((m) => [...m, { role: 'assistant', text: answer }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'error', text: `Ask failed: ${e.message}` },
      ])
    } finally {
      setLoadingAnswer(false)
    }
  }

  // ---- Render helpers ----------------------------------------------------
  const healthBadge = useMemo(() => {
    if (health === 'ok') return <span className="badge ok">OK</span>
    if (health === 'down') return <span className="badge down">DOWN</span>
    return <span className="badge">…</span>
  }, [health])

  // ---- UI ----------------------------------------------------------------
  return (
    <div className="container">
      <h1>GarvanGPT — Pharmacist</h1>

      <div className="status">
        <span>Status: </span>
        <strong className={health === 'ok' ? 'green' : 'red'}>
          {health === 'ok' ? 'backend OK' : 'backend DOWN'}
        </strong>
        <span> • Session: </span>
        <code>{sessionId || '—'}</code>
        <span> • API at </span>
        <code>{API_BASE}</code>
      </div>

      {/* Ask box */}
      <div className="askRow">
        <input
          type="text"
          placeholder="e.g., What are the main side effects of Efexor XL?"
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <button onClick={ask} disabled={!askText.trim() || loadingAnswer}>
          {loadingAnswer ? 'Asking…' : 'Ask'}
        </button>
      </div>

      {/* Controls */}
      <div className="controls">
        <button onClick={resetSession}>Reset session</button>
        <button onClick={checkHealth}>Health check {healthBadge}</button>

        <div className="spacer" />
        <span className="label">Memory:</span>
        <button onClick={loadMemory}>Refresh memory</button>
        <span className="dim">(items: {memoryCount})</span>
      </div>

      {/* Add memory */}
      <div className="addMem">
        <span className="dim">Add a memory item</span>
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="fact">fact</option>
          <option value="answer">answer</option>
        </select>
        <div className="row">
          <textarea
            rows={3}
            placeholder="Type a short fact to save…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
        </div>
        <div className="row">
          <button onClick={saveMemoryItem} disabled={!newItem.trim() || saving}>
            {saving ? 'Saving…' : 'Save to memory'}
          </button>
          <button className="secondary" onClick={() => setNewItem('')}>
            Clear
          </button>
        </div>
      </div>

      {/* Inline error line (non-blocking) */}
      {uiError ? <div className="error">{uiError}</div> : null}

      {/* Memory list */}
      <div className="memList">
        {memoryItems.length === 0 ? (
          <div className="empty dim">No items saved for this session yet.</div>
        ) : (
          memoryItems.map((it, idx) => (
            <div className="memItem" key={idx}>
              <span className="bullet">•</span>
              <span className="type">{it.type}</span>
              <span className="text">{it.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Simple transcript for Ask */}
      {messages.length > 0 && (
        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="role">{m.role}:</span> {m.text}
            </div>
          ))}
        </div>
      )}

      {/* Tiny styles so it looks tidy without Tailwind */}
      <style>{`
        .container { max-width: 920px; margin: 40px auto; padding: 0 16px; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto; }
        h1 { font-size: 44px; margin-bottom: 12px; }
        .status { margin-bottom: 12px; color: #333 }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
        .green { color: #15803d }
        .red { color: #b91c1c }
        .badge { margin-left: 6px; font-size: 12px; padding: 2px 6px; border-radius: 999px; background: #e5e7eb; }
        .badge.ok { background: #dcfce7; color: #166534 }
        .badge.down { background: #fee2e2; color: #991b1b }
        .askRow { display: flex; gap: 10px; margin: 18px 0; }
        .askRow input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; }
        button { padding: 10px 14px; border: 1px solid #111827; border-radius: 10px; background: #111827; color: white; cursor: pointer; }
        button:disabled { opacity: 0.6; cursor: not-allowed }
        .secondary { background: white; color: #111827; border-color: #d1d5db; }
        .controls { display: flex; align-items: center; gap: 10px; margin: 10px 0 20px; }
        .label { color: #374151; }
        .dim { color: #6b7280 }
        .spacer { flex: 1 }
        .addMem { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fafafa; }
        .addMem .row { display: flex; gap: 10px; margin-top: 8px; }
        textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .memList { margin-top: 20px; }
        .memItem { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; margin-bottom: 8px; align-items: baseline; }
        .memItem .bullet { color: #6b7280 }
        .memItem .type { font-size: 12px; background: #eef2ff; color: #3730a3; padding: 2px 6px; border-radius: 999px; margin-right: 6px; }
        .memItem .text { white-space: pre-wrap }
        .empty { padding: 14px; border: 1px dashed #e5e7eb; border-radius: 10px; }
        .error { margin-top: 12px; color: #b91c1c; }
        .chat { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .msg { padding: 8px 10px; border-radius: 8px; margin-bottom: 8px; }
        .msg.user { background: #eef2ff }
        .msg.assistant { background: #ecfeff }
        .msg.error { background: #fef2f2; color: #991b1b }
        .msg .role { font-weight: 600; margin-right: 6px; text-transform: capitalize; }
      `}</style>
    </div>
  )
}
