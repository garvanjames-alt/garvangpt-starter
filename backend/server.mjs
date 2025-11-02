// backend/server.mjs
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { memoryRouter } from "./memoryRouter.mjs";
import { adminRouter } from "./adminRouter.mjs";

// ✅ Correct way to use a CJS module from ESM:
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { respondHandler } = require("./respondHandler.cjs");

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/health", (_req, res) => res.send("OK"));

// Global rate limit (keep it simple)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Routes
app.use("/api/login", adminRouter);         // POST /api/login
app.use("/api/admin", adminRouter);         // GET /api/admin/ping
app.use("/api/memory", memoryRouter);       // GET/POST/DELETE memory
app.post("/api/respond", respondHandler);   // ✅ now a real function

app.listen(port, () => {
  console.log(`Almost Human server listening on :${port}`);
});
