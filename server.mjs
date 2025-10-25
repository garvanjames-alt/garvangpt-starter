// Lightweight dev proxy so the frontend (5175) can talk to the backend (3001)
// via http://localhost:8080 for both HTTP (/api/*) and WebSocket (/realtime).
// Run from the REPO ROOT:
//   npm i http-proxy
//   node server.mjs

import http from "node:http";
import httpProxy from "http-proxy";

const TARGET = process.env.PROXY_TARGET || "http://localhost:3001"; // your backend
const PORT = Number(process.env.PORT || 8080);

// Helpful in dev: allow Vite origin by default
const DEV_ORIGIN = process.env.ALLOW_ORIGIN || "http://localhost:5175";

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  ws: true,
  changeOrigin: true,
  secure: false,
});

proxy.on("error", (err, req, res) => {
  console.error("[proxy] error:", err?.message || err);
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify({ ok: false, error: "proxy_error" }));
});

const server = http.createServer((req, res) => {
  // Basic CORS for dev
  res.setHeader("Access-Control-Allow-Origin", DEV_ORIGIN);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Forward everything to the backend
  proxy.web(req, res, { target: TARGET });
});

server.on("upgrade", (req, socket, head) => {
  // Forward WebSocket upgrades (used for /realtime)
  proxy.ws(req, socket, head, { target: TARGET });
});

server.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT} -> ${TARGET}`);
});
