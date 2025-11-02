import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/ping", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET);
    res.json({ ok: true, user: decoded, ts: Date.now() });
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
});

export const adminRouter = router;
