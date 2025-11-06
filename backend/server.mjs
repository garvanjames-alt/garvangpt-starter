// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// --- middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// --- STEP 1: health check only ---
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, service: "backend" });
});

// --- keep listening ---
app.listen(PORT, () => {
  console.log(`[boot] server listening on :${PORT}`);
});
