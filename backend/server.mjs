// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// --- middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// --- health check ---
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, service: "backend" });
});

// --- respond endpoint (POST for app; GET for quick browser check) ---
app.post("/api/respond", async (req, res) => {
  try {
    const question = (req.body?.question || "").slice(0, 200);
    console.log(`[respond] ${new Date().toISOString()} q="${question}"`);
    return res.status(200).json({ ok: true, echoed: question });
  } catch (err) {
    console.error("[respond] error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Convenience GET so you can verify in a browser without tools
app.get("/api/respond", (req, res) => {
  res.json({ ok: true, note: "POST /api/respond is ready" });
});

// --- start server ---
app.listen(PORT, () => {
  console.log(`[boot] server listening on :${PORT}`);
});
