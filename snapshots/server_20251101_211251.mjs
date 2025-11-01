// backend/server.mjs
// Express server for GarvanGPT — keeps existing endpoints and adds GET /api/memory
import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// --- Health ---
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok' })
})

// --- Utilities ---
const MEMORY_FILE = path.join(__dirname, 'memory.jsonl')

async function ensureFile() {
  try { await fs.access(MEMORY_FILE) } catch { await fs.writeFile(MEMORY_FILE, '') }
}

async function readMemoryItems() {
  try {
    const buf = await fs.readFile(MEMORY_FILE, 'utf8')
    const items = buf
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
      .map(obj => (typeof obj.text === 'string' ? obj.text : ''))
      .filter(Boolean)
    return items
  } catch {
    return []
  }
}

// --- /api/respond ---
// Prefer using your existing respond handler if present (./respondHandler.cjs)
let respondModule
try {
  respondModule = require('./respondHandler.cjs')
} catch {
  respondModule = null
}

app.post(['/api/respond', '/respond'], async (req, res) => {
  try {
    const question = (req.body?.question || req.body?.text || req.query?.question || '').toString().trim()
    if (!question) return res.status(400).json({ error: 'Invalid or empty "question" field' })

    // If user provided respond handler exists, try a few common signatures
    if (respondModule) {
      // 1) { respond: async (question) => string }
      if (typeof respondModule.respond === 'function') {
        const reply = await respondModule.respond(question)
        return res.json({ reply })
      }
      // 2) default export function(question) => string
      if (typeof respondModule.default === 'function') {
        const reply = await respondModule.default(question)
        return res.json({ reply })
      }
      // 3) handler(req,res) style
      if (typeof respondModule.handler === 'function') {
        return respondModule.handler(req, res)
      }
    }

    // Fallback: echo minimal reply (should not be used if your handler exists)
    return res.json({ reply: `You asked: ${question}` })
  } catch (e) {
    console.error('respond error', e)
    res.status(500).json({ error: 'respond failed' })
  }
})

// --- /api/tts --- (proxy to ElevenLabs)
app.post(['/api/tts', '/tts'], async (req, res) => {
  try {
    const text = (req.body?.text || req.body?.reply || '').toString().trim()
    if (!text) return res.status(400).json({ error: 'Missing text' })

    const apiKey = process.env.ELEVENLABS_API_KEY
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // default voice if not set
    if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' })

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2' })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      console.error('elevenlabs tts failed', r.status, t)
      return res.status(502).json({ error: 'tts upstream failed', status: r.status })
    }
    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg')
    res.send(buf)
  } catch (e) {
    console.error('tts error', e)
    res.status(500).json({ error: 'tts failed' })
  }
})

// --- Memory API ---
// Add: GET /api/memory → { items: [...] }
app.get(['/api/memory', '/memory'], async (req, res) => {
  try {
    await ensureFile()
    const items = await readMemoryItems()
    res.json({ items })
  } catch (e) {
    console.error('memory list error', e)
    res.status(500).json({ error: 'memory list failed' })
  }
})

// POST /api/memory { text }
app.post(['/api/memory', '/memory'], async (req, res) => {
  try {
    await ensureFile()
    const text = (req.body?.text || req.body?.question || '').toString().trim()
    if (!text) return res.status(400).json({ error: 'Missing text' })
    const line = JSON.stringify({ text, ts: Date.now() }) + '\n'
    await fs.appendFile(MEMORY_FILE, line, 'utf8')
    res.json({ ok: true })
  } catch (e) {
    console.error('memory add error', e)
    res.status(500).json({ error: 'memory add failed' })
  }
})

// DELETE /api/memory → clears file
app.delete(['/api/memory', '/memory'], async (req, res) => {
  try {
    await fs.writeFile(MEMORY_FILE, '', 'utf8')
    res.json({ ok: true })
  } catch (e) {
    console.error('memory clear error', e)
    res.status(500).json({ error: 'memory clear failed' })
  }
})

// --- Start ---
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
