// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ------------------------------
// Config
// ------------------------------
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0"; // important for Render

// Comma-separated allowlist; default allows local + Netlify app
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://garvangpt.netlify.app"
).split(",").map(s => s.trim());

const corsOptions = {
  origin(origin, cb) {
    // allow curl/postman/no-Origin
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    const err = new Error("CORS");
    err.message = "CORS";
    return cb(err);
  }
};

// ------------------------------
// App
// ------------------------------
const app = express();

// serve static PDFs (two safe mounts)
const repoRoot = process.cwd(); // /opt/render/project/src
const pdfDirA  = path.resolve(__dirname, "..", "ingest", "pdfs"); // relative to backend/
const pdfDirB  = path.resolve(repoRoot, "ingest", "pdfs");        // relative to repo root
console.log("[static] pdfDirA:", pdfDirA);
console.log("[static] pdfDirB:", pdfDirB);

app.use("/ingest/pdfs", express.static(pdfDirB, {
  setHeaders(res) { res.setHeader("Cache-Control", "public, max-age=3600"); }
}));
app.use("/ingest/pdfs", express.static(pdfDirA, {
  setHeaders(res) { res.setHeader("Cache-Control", "public, max-age=3600"); }
}));

app.use(cors(corsOptions));
app.use(express.json());

// fallback explicit PDF route (logs what it tried)
app.get("/ingest/pdfs/:name", (req, res) => {
  const candidate1 = path.join(pdfDirB, req.params.name);
  const candidate2 = path.join(pdfDirA, req.params.name);
  console.log("[pdf GET]", req.params.name, "\n  try1:", candidate1, "\n  try2:", candidate2);
  res.sendFile(candidate1, err1 => {
    if (!err1) return;
    res.sendFile(candidate2, err2 => {
      if (!err2) return;
      console.error("[pdf 404]", req.params.name);
      res.status(404).send("PDF not found");
    });
  });
});

// ------------------------------
// Dev shim respond endpoint
// ------------------------------
app.post("/respond", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();

    const sources = [
      "ingest/pdfs/25071900000128283.pdf#page=9",
      "ingest/pdfs/25071900000128283.pdf#page=10",
      "ingest/pdfs/25071900000128283.pdf#page=11",
      "ingest/pdfs/25071900000128283.pdf#page=12",
      "ingest/pdfs/25071900000128283.pdf#page=13",
      "ingest/pdfs/25071900000128283.pdf#page=14",
      "ingest/pdfs/25071900000128283.pdf#page=15",
      "ingest/pdfs/25071900000128283.pdf#page=16",
      "ingest/pdfs/25071900000128283.pdf#page=17",
      "ingest/pdfs/25071900000128283.pdf#page=18",
    ];

    const memories = [];

    const markdown = [
      "## Here’s what I found",
      `- Echo (dev shim): ${text || "Using the clinic docs, what should a new patient bring?"}`,
      "",
      "## Summary (non-diagnostic)",
      "This is an informational summary and **not** a diagnosis. Consult a licensed clinician.",
      "",
      "## Sources used",
      ...sources.map((s, i) => `${i + 1}. ${s}`),
      "",
      "## Memories referenced",
      memories.length ? memories.map((m, i) => `${i + 1}. ${m}`).join("\n") : "(none)",
    ].join("\n");

    res.json({ markdown, sources, memories });
  } catch (e) {
    console.error("/respond error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// ------------------------------
// Health checks (both paths OK)
// ------------------------------
app.get("/health", (_req, res) => { res.json({ ok: true }); });
// Also return 200 on root in case the Render setting points to "/"
app.get("/", (_req, res) => { res.status(200).send("ok"); });

// ------------------------------
// Error handler
// ------------------------------
app.use((err, _req, res, _next) => {
  console.error("[error]", err?.message || err);
  if (String(err?.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }
  res.status(500).json({ error: "Server error" });
});

// ------------------------------
// Listen (explicit host)
// ------------------------------
app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
