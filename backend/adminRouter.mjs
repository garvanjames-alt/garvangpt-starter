import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// GET /api/admin/ping  (requires Authorization: Bearer <token>)
router.get("/ping", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "unauthorized" });
  const token = authHeader.split(" ")[1] ?? "";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    return res.json({ ok: true, user: decoded, ts: Date.now() });
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
});

// POST /api/login  { "username": "garvan", "password": "<YOUR_PLAIN_PASSWORD>" }
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USERNAME || "garvan";
  const adminPass = process.env.ADMIN_PASSWORD_PLAIN || "";

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const payload = { sub: username, role: "admin" };
  const token = jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", { expiresIn: "2h" });

  // Send JWT back (header is fine; cookie is optional)
  res.setHeader("Authorization", `Bearer ${token}`);
  return res.json({ ok: true, user: payload });
});

export const adminRouter = router;
