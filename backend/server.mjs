import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { respondHandler } from "./respondHandler.cjs";
import { memoryRouter } from "./memoryRouter.cjs";
import { adminRouter } from "./adminRouter.cjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 🌐 Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// ⚙️ Rate limiter (global defaults)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min window
  max: 200,                 // limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ⚙️ Stricter limiter for auth and AI endpoints
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10,                 // limit to 10 per minute
  message: { error: "Too many requests, please slow down." },
});

// 🧩 Routes
app.use("/api/login", strictLimiter, adminRouter);
app.use("/api/respond", strictLimiter, respondHandler);
app.use("/api/memory", strictLimiter, memoryRouter);

// 🧠 Admin ping
app.get("/api/admin/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.listen(port, () => {
  console.log(`Almost Human server listening on :${port}`);
});
