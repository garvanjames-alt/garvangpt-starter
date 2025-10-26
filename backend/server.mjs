import express from "express";
import cors from "cors";

const app = express();

// Allow list from env (comma-separated)
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// CORS middleware
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl / health checks (no Origin header)
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Explicitly handle preflight for all routes
app.options("*", cors());

// …the rest of your routes…
