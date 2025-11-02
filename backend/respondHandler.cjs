// backend/respondHandler.cjs
const express = require("express");

// Minimal "AI" handler (keeps existing contract: returns { ok, text })
function respondHandler(req, res) {
  const { text } = req.body || {};
  const reply = text ? `You said: ${text}` : "Hello from /api/respond";
  res.json({ ok: true, text: reply });
}

module.exports = { respondHandler };
