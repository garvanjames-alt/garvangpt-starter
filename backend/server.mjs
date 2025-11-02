import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

const PORT = process.env.PORT || 10000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "garvan";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// In-memory store for simplicity
let memory = { items: [] };

// Middleware to verify JWT token (if exists)
app.use((req, res, next) => {
  const token = req.cookies?.gh_session;
  if (token) {
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      req.user = decoded;
    } catch (err) {
      console.error("Invalid token");
    }
  }
  next();
});

// --- Health check
app.get("/health", (req, res) => res.send("OK"));

// --- Public: List memories
app.get("/api/memory", (req, res) => {
  res.json({ items: memory.items });
});

// --- Protected: Add new memory (admin only)
app.post("/api/memory", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "missing text" });
  memory.items.push(text);
  res.json({ ok: true, items: memory.items });
});

// --- Protected: Clear all memories
app.delete("/api/memory", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }

  memory.items = [];
  res.json({ ok: true, items: [] });
});

// --- Auth: Login (plain password matches ADMIN_PASSWORD_HASH)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign({ sub: username, role: "admin" }, SESSION_SECRET, {
    expiresIn: "2h",
  });
  res.cookie("gh_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.json({ ok: true, user: { username, role: "admin" } });
});

// --- Protected: /api/admin/ping
app.get("/api/admin/ping", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ ok: true, user: req.user, ts: Date.now() });
});

// --- Step 86: Simple /admin dashboard route
app.get("/admin", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(401).send("Unauthorized");
  }

  res.send(`
    <html>
      <head><title>Admin Dashboard</title></head>
      <body style="font-family: system-ui; padding: 20px; max-width: 700px;">
        <h1>🧠 Almost Human Admin</h1>
        <p>Welcome, <b>${req.user.sub}</b></p>
        <p>Memory items:</p>
        <pre style="background:#f4f4f4;padding:10px;border-radius:8px;">
${JSON.stringify(memory.items, null, 2)}
        </pre>
      </body>
    </html>
  `);
});

// --- Fallback
app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(PORT, () => {
  console.log(`Almost Human server listening on :${PORT}`);
});
