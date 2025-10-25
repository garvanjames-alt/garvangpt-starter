require('dotenv').config()
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3001


// --- simple CORS for local dev ---
app.use((req, res, next) => {
res.header('Access-Control-Allow-Origin', '*')
res.header('Access-Control-Allow-Headers', 'Content-Type')
res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
if (req.method === 'OPTIONS') return res.sendStatus(200)
next()
})


// parse JSON bodies
app.use(express.json())


// --- respond handler (import if present, otherwise stub) ---
let respondHandler
try {
respondHandler = require('./respondHandler.cjs')
} catch (e) {
respondHandler = function stubRespond(req, res) {
const { question = '' } = req.body || {}
res.json({
answer: `I received your question: "${question}". (stub)`,
sources: [],
usedMemories: [],
})
}
}


// --- health ---
app.get('/health', (req, res) => {
res.type('text/plain').send('ok')
})


// --- memory store + routes ---
const MEM = [] // resets on server restart


app.get('/api/memory', (req, res) => {
res.json({ items: MEM })
})


app.post('/api/memory', (req, res) => {
const { text } = req.body || {}
if (typeof text !== 'string' || !text.trim()) {
return res.status(400).json({ error: 'text required' })
}
const item = { id: Date.now().toString(), text: text.trim(), ts: new Date().toISOString() }
MEM.push(item)
res.json({ ok: true, item, items: MEM })
})


app.delete('/api/memory', (req, res) => {
MEM.length = 0
res.json({ ok: true, items: MEM })
})


// --- chat endpoints ---
app.post('/api/respond', respondHandler);
app.post('/respond', respondHandler); // alias

// --- start server ---
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
