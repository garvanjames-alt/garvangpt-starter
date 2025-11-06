# Staging Stack (Almost Human)

## Services
- Frontend (static): https://almosthuman-frontend-staging.onrender.com
- Backend (node):   https://almosthuman-starter-staging.onrender.com

## Render Settings

### Frontend (Static)
- Repo: garvanjames-alt/almosthuman-frontend-staging
- Branch: feat/branding-pass (then main after merge)
- Auto-Deploy: On Commit
- Rewrites:
  - /respond  → https://almosthuman-starter-staging.onrender.com/api/respond (Rewrite)
  - /api/tts  → https://almosthuman-starter-staging.onrender.com/api/tts (Rewrite)

### Backend (Node)
- Repo: garvanjames-alt/garvangpt-starter
- Branch: feat/branding-pass (then main after merge)
- Auto-Deploy: On Commit
- Health check: GET /api/ping

## Required Env Vars (Render → Environment)
- OPENAI_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE  (e.g., “Rachel”)

## Quick Verify
1. Open backend:  https://almosthuman-starter-staging.onrender.com/api/ping → `{ ok: true, service: "backend" }`
2. In the frontend console:
   - `fetch('/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'what is amoxicillin?'})}).then(r=>r.json())`
   - Expect a JSON answer.
3. TTS probe (in console):
   - `fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Australian voice connectivity test'})})`
   - Expect status 200 and an audio control that plays.
