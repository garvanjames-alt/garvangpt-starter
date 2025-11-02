import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createRequire } from "module";
import { memoryRouter } from "./memoryRouter.mjs";

// use require to safely load CommonJS modules from ESM
const require = createRequire(import.meta.url);
const { respondHandler } = require("./respondHandler.cjs");

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// CORS & parsers
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.send("OK");
});

// Global rate limit (sane default)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200, // 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Stricter limiter for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: "Too many requests, please slow down." },
});

// Routes
app.post("/api/respond", strictLimiter, respondHandler);
app.use("/api/memory", strictLimiter, memoryRouter);

// NOTE: We intentionally removed any unprotected /api/admin/ping.
// If you still want /api/admin routes, we’ll add them back as ESM later.

app.listen(port, () => {
  console.log(`Almost Human server listening on :${port}`);
});
