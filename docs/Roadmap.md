| #  | Step / Milestone        | Brief note                       | Status              |
| -- | ----------------------- | -------------------------------- | ------------------- |
| 1  | Vision & scope          | Who/what/why                     | ✅ Done              |
| 2  | Name & domain           | Brand + URL                      | ✅ Done              |
| 3  | Repo setup              | GitHub, main                     | ✅ Done              |
| 4  | Local dev ready         | Node/Vite scripts                | ✅ Done              |
| 5  | Frontend scaffold       | Hero/CTAs/layout                 | ✅ Done              |
| 6  | Backend scaffold        | Express routes                   | ✅ Done              |
| 7  | Healthcheck             | `/health` ok                     | ✅ Done              |
| 8  | Deploy backend (dev)    | Render web svc                   | ✅ Done              |
| 9  | Deploy frontend (dev)   | Render static                    | ✅ Done              |
| 10 | Env variables           | Keys/models                      | ✅ Done              |
| 11 | CORS config             | Allow frontend                   | ✅ Done              |
| 12 | Memory API              | GET/POST/DELETE                  | ✅ Done              |
| 13 | Memory UI               | Add/list/clear                   | ✅ Done              |
| 14 | Fix builds              | Imports/paths                    | ✅ Done              |
| 15 | Prototype chat          | `/respond` loop                  | ✅ Done              |
| 16 | Transcript UI           | Text + send                      | ✅ Done              |
| 17 | Mic (STT)               | Start/stop                       | ✅ Done              |
| 18 | TTS proxy               | ElevenLabs `/tts`                | ✅ Done              |
| 19 | Auto speak reply        | Voice answer                     | ✅ Done              |
| 20 | Voice UX checks         | Buttons flow                     | ✅ Done              |
| 21 | Source inventory        | List all corpora                 | ✅ Done              |
| 22 | Prioritize sets         | S-01, S-02, S-03                 | ✅ Done              |
| 23 | Format policy           | PDF/DOC/MD rules                 | ✅ Done              |
| 24 | Rights & licenses       | Usage verified                   | ✅ **Done**          |
| 25 | PII policy              | Redaction rules                  | ✅ Done              |
| 26 | Staging folders         | `/ingest` structure              | ✅ Done              |
| 27 | Bulk import plan        | Batches strategy                 | ✅ Done              |
| 28 | OCR pass                | Run OCR on scanned PDFs          | ⏳ **Planned**       |
| 29 | Text normalization      | UTF-8/whitespace                 | ✅ Done (sample run) |
| 30 | Page extraction         | Per-page text (PDFs)             | ⏳ Planned           |
| 31 | Normalized HTML batch   | Convert site pages → `.txt`      | ✅ Done              |
| 32 | Load normalized content | Batch load to `data/memory.json` | ✅ Done              |
| 33 | RAG stub                | Simple findTop over memory       | ✅ Done              |
| 34 | Answer composer v1      | Deterministic template           | ✅ Done              |
| 35 | Debug endpoint logs     | Prompt/candidates/sources        | ✅ Done              |
| 36 | Frontend “sources used” | Pills/Chips list                 | ✅ Done              |
| 37 | “Memories referenced”   | Footer text                      | ✅ Done              |
| 38 | Backend guardrails      | Safe prompt shaping              | ✅ Done              |
| 39 | Dev smoke tests (curl)  | `/api/memory` & `/respond`       | ✅ Done              |
| 40 | Tag release MVP         | `mvp-rag-OK`                     | ✅ Done              |
| 41 | Error handling pass     | 4xx/5xx UX                       | ⏳ Planned           |
| 42 | Loading states          | Buttons/spinners                 | ⏳ Planned           |
| 43 | Rate-limit (basic)      | Per-IP dev guard                 | ⏳ Planned           |
| 44 | API key handling        | No keys in client                | ✅ Done              |
| 45 | Content gaps list       | Prioritize missing topics        | ⏳ Planned           |
| 46 | Normalize batch #2      | Next 50–100 pages                | ⏳ Planned           |
| 47 | Memory growth test      | Size/latency baseline            | ⏳ Planned           |
| 48 | Compose v2              | Sectioned, bulletized            | ⏳ Planned           |
| 49 | Source scoring          | Tie-break/boost recency          | ⏳ Planned           |
| 50 | Frontend polish         | Typography & spacing             | ✅ Done (MVP)        |
| 51 | “Show debug” toggle     | Reveal sources & JSON            | ✅ Done              |
| 52 | Accessibility pass      | Labels/contrast                  | ⏳ Planned           |
| 53 | Mobile layout           | Responsive checks                | ⏳ Planned           |
| 54 | Unit tests (server)     | Core utilities                   | ⏳ Planned           |
| 55 | E2E test script         | Happy path smoke                 | ⏳ Planned           |
| 56 | Logging & tracing       | Req/resp timing                  | ⏳ Planned           |
| 57 | Metrics skeleton        | RPS, p95, failures               | ⏳ Planned           |
| 58 | Content policy UI       | Disclaimer & scope               | ⏳ Planned           |
| 59 | Safety prompts          | Avoid diagnosis                  | ✅ Done (MVP)        |
| 60 | Audit trail MVP         | Store Q, sources, ts             | ⏳ Planned           |
| 61 | Clinic PDFs staging     | Upload & catalog                 | ⏳ Planned           |
| 62 | OCR run #1              | PDFs → text                      | ⏳ Planned           |
| 63 | Normalize PDFs          | Apply policy                     | ⏳ Planned           |
| 64 | Load clinic PDFs        | Into memory                      | ⏳ Planned           |
| 65 | Snapshot public site    | Crawl sitemap                    | ✅ Done (seed)       |
| 66 | Content freshness plan  | Weekly diff ingest               | ⏳ Planned           |
| 67 | Admin page (internal)   | Ingest status                    | ⏳ Planned           |
| 68 | Secrets mgmt            | Render/Env                       | ✅ Done              |
| 69 | 404/health pages        | Frontend routes                  | ✅ Done              |
| 70 | Caching layer (light)   | In-proc memoization              | ⏳ Planned           |
| 71 | Prompt library          | Reusable templates               | ⏳ Planned           |
| 72 | Response eval sheet     | Manual rubric                    | ⏳ Planned           |
| 73 | Hallucination checks    | Source-anchored only             | ✅ In place (MVP)    |
| 74 | Tone/style guide        | Pharmacist voice                 | ✅ Done              |
| 75 | Persona tuning          | Non-diagnostic framing           | ✅ Done              |
| 76 | UI copy pass            | Microcopy clarity                | ✅ Done              |
| 77 | Browser tests           | Chrome/Safari                    | ⏳ Planned           |
| 78 | Deploy preview env      | PR previews                      | ⏳ Planned           |
| 79 | CDN headers             | Cache/static                     | ⏳ Planned           |
| 80 | Prod infra sketch       | Scale path                       | ⏳ Planned           |
| 81 | Data retention policy   | Delete windows                   | ⏳ Planned           |
| 82 | Consent & privacy copy  | Links and notices                | ⏳ Planned           |
| 83 | Incident playbook       | Rollback/keys                    | ⏳ Planned           |
| 84 | SLA/SLO draft           | Internal targets                 | ⏳ Planned           |
| 85 | Metrics dashboard       | Simple charts                    | ⏳ Planned           |
| 86 | User feedback loop      | “Was this helpful?”              | ⏳ Planned           |
| 87 | Search box UX           | Enter to send                    | ✅ Done              |
| 88 | Keyboard a11y           | Focus & tabs                     | ⏳ Planned           |
| 89 | Readme update           | Dev quickstart                   | ✅ Done              |
| 90 | Launch checklist        | Final pass & tag                 | ⏳ Planned           |
| #      | Step / Milestone                | Brief note                                                            | Status                                   |
| ------ | ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| **91** | Avatar design (visual identity) | Generate realistic pharmacist avatar of you (“Almost Human” brand)    | ✅ *Prototype ready (image design stage)* |
| **92** | Personality scripting           | Define tone/persona file (empathetic, medically factual, “GarvanGPT”) | ✅ Done (seeded in app prompt templates)  |
| **93** | Voice configuration             | Connect ElevenLabs API for TTS with your chosen voice                 | ✅ MVP working (`/tts` proxy confirmed)   |
| **94** | Avatar + voice integration      | Combine real-time ElevenLabs output with avatar animation (frontend)  | 🔜 Next phase after MVP polish           |
| **95** | Personality tuning v2           | Fine-tune answers + emotional tone (AI educator style)                | 🔜 Planned                               |
| **96** | Conversational flow             | Add idle/typing animations + reactivity                               | 🔜 Planned                               |
| **97** | Feedback loop                   | Let users rate tone accuracy                                          | 🔜 Planned                               |
