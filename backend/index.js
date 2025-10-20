// GarvanGPT backend — stable baseline

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";

// ---- Load environment ----
dotenv.config();

// ---- Configuration ----
const PORT = 3001;

// Allow both 5173 and 5174 (Vite may switch ports)
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl, Postman
    const ok = /^http:\/\/localhost:(5173|5174)$/.test(origin);
    cb(ok ? null : new Error(`CORS blocked: ${origin}`), ok);
  },
  credentials: false,
};

// ---- Simple memory store ----
const memoryStore = {
  data: {},
  add(session, item) {
    if (!this.data[session]) this.data[session] = [];
    this.data[session].push({ ...item, ts: Date.now() });
  },
  list(session) {
    return this.data[session] || [];
  },
  count(session) {
    return (this.data[session] || []).length;
  },
  clear(session) {
    this.data[session] = [];
  },
};

// ---- App setup ----
const app = express();
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// ---- Health + route debug ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, body: "ok" });
});

app.get("/__routes", (_req, res) => {
  const routes = [];
  const stack = app._router?.stack || [];
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).filter(Boolean);
      routes.push({ method: methods[0]?.toUpperCase() || "GET", path: layer.route.path });
    }
  }
  res.json({ ok: true, routes });
});

// ---- Memory API ----
app.get("/memory/status", (req, res) => {
  const session = req.header("X-Session-ID") || "default";
  res.json({ session, count: memoryStore.count(session) });
});

app.get("/memory/list", (req, res) => {
  const session = req.header("X-Session-ID") || "default";
  res.json({ items: memoryStore.list(session) });
});

app.post("/memory/clear", (req, res) => {
  const session = req.header("X-Session-ID") || "default";
  memoryStore.clear(session);
  res.json({ ok: true });
});
// Save a memory item (question/answer/etc.)
app.post("/memory/save", (req, res) => {
  try {
    const b = req.body || {};
    const session = b.session || req.header("X-Session-ID") || "default";
    const type = b.type || "note";
    const text = (b.text ?? "").toString();

    memoryStore.add(session, { type, text });
    res.json({ ok: true, count: memoryStore.count(session) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/session/clone", (req, res) => {
  const from = req.header("X-Session-ID") || "default";
  const to = `web-${Math.random().toString(36).slice(2, 8)}-${Math.random()
    .toString(36)
    .slice(2, 5)}`;
  memoryStore.data[to] = [...(memoryStore.data[from] || [])];
  res.json({ ok: true, from, to, count: memoryStore.count(to) });
});

// ---- OpenAI Setup ----
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = apiKey ? new OpenAI({ apiKey }) : null;

// ---- Respond route ----
app.post("/respond", async (req, res) => {
  try {
const b = req.body || {};
const prompt =
  (b.prompt ?? b.message ?? b.text ?? b.q ?? b.input ?? "").toString();
const session = b.session || req.header("X-Session-ID") || "default";

if (!prompt.trim()) {
  return res.status(400).json({ ok: false, error: "Missing prompt" });
}

    memoryStore.add(sid, { type: "user", text: prompt });

    let reply = "(no OpenAI key configured)";
    if (openai) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are GarvanGPT, a helpful pharmacist." },
          ...memoryStore.list(sid).map((m) =>
            m.type === "user"
              ? { role: "user", content: m.text }
              : { role: "assistant", content: m.text }
          ),
        ],
      });
      reply = completion.choices[0].message.content;
    } else {
      reply = "Efexor (venlafaxine) is an SNRI used for depression and anxiety.";
    }

    memoryStore.add(sid, { type: "assistant", text: reply });
    res.json({ ok: true, reply });
  } catch (error) {
    console.error("Error in /respond:", error);
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});

// ---- Start server ----
const server = app.listen(PORT, () => {
  console.log(`✅ GarvanGPT backend running at http://localhost:${PORT}`);

  const stack = (app && app._router && Array.isArray(app._router.stack))
    ? app._router.stack
    : [];

  const rows = [];
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {}).filter(Boolean);
      rows.push(`${(methods[0] || "GET").toUpperCase()}  ${layer.route.path}`);
    }
  });

  if (rows.length) {
    console.log("🔍 Registered routes:");
    rows.forEach((ln) => console.log("  -", ln));
  } else {
    console.log("🔍 Registered routes:");
    console.log("  (none yet)");
  }
});

export default server;
