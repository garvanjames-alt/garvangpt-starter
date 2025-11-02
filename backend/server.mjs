// backend/server.mjs
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// 1) ESM-safe paths  ⬇️
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// ... keep your existing API routes here ...
// app.get('/health', ...)
// app.use('/api/memory', ...)
// app.post('/api/respond', ...)

// 2) Serve the built frontend (../frontend/dist)  ⬇️
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// 3) SPA fallback for non-API routes  ⬇️
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
