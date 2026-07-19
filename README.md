# Stadium Command Center — FIFA World Cup 2026

A real-time, GenAI-powered operational intelligence dashboard for stadium command staff during FIFA World Cup 2026 matches.

## The problem this solves

During a live match, field stewards, security teams, and medical staff report incidents over radio in raw, unstructured language — "fight breaking out in Section E, gate 4 blocked." Command center staff have to manually triage this stream of noisy reports in real time, under pressure, while also trying to maintain overall situational awareness across dozens of simultaneous incidents.

This directly targets the challenge's core objective: **using generative AI for real-time decision support and operational intelligence** during the tournament. The system turns raw radio chatter into structured, prioritized, actionable intelligence in seconds — and goes a step further by synthesizing multiple simultaneous incidents into a single commander-level judgment call, not just a list of alerts.

## How it works

1. **Operator input** — a steward or dispatcher pastes a raw report into the terminal.
2. **AI classification** — the report is sent to Gemini 1.5 Flash with a strict JSON schema, returning:
   - `category` (Security / Medical / Logistics)
   - `priority` (Low / Medium / High / Critical)
   - a one-sentence summary
   - three specific, actionable tactical steps for field crew
   - a confidence score
3. **Live dashboard update** — the classified incident appears in the table immediately, and the top-level counters update without a page reload.
4. **Commander's Briefing** — on demand or on a refresh interval, Gemini synthesizes all currently *active* incidents into a short situational briefing for command staff: what's happening, the biggest risk right now, and what to prioritize next. This is the differentiator beyond single-item classification — it's the AI reasoning across the full incident picture the way a human commander would.
5. **Resolution tracking** — command staff can mark incidents resolved, which updates live counts and removes them from the active briefing calculation.

## Resilience: works even if the AI is down

If `GEMINI_API_KEY` is not set, or a Gemini call fails for any reason, the system falls back to a local keyword-scoring heuristic engine automatically, for both classification and briefing generation. The dashboard stays fully operational — this matters for a live operations tool, where "the AI service is down" cannot mean "the dashboard is unusable."

## Architecture

```
server.js              — slim entry point, mounts routes and static files
routes/incidents.js     — all HTTP endpoint logic
services/gemini.js      — Gemini classification + briefing generation
services/fallback.js    — local heuristic classifier + briefing (no external calls)
store.js                — in-memory incident state and computed metrics
constants.js            — shared priority/category constants
dashboard.html           — frontend, vanilla HTML/CSS/JS, no build step
```

Kept deliberately simple:
- **In-memory store, not a database.** This is a demo-scale command-center tool, not a production system — adding Postgres/Firestore here would add setup complexity without adding real value to the submission.
- **No frontend framework.** A single static HTML file served directly by Express keeps the container lightweight and removes an entire build pipeline from the deployment story.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/generate` | Classify raw incident text, store it, return the structured envelope |
| GET | `/api/incidents` | Full current incident list |
| PATCH | `/api/incidents/:incidentId/resolve` | Mark an incident resolved |
| GET | `/api/metrics` | Live computed counts (active/security/medical/logistics/attendance) |
| GET | `/api/briefing` | AI-synthesized situational briefing across active incidents |

## Running locally

```bash
npm install
GEMINI_API_KEY=your_key_here npm start
# or, to run in fallback-only mode with no API key:
npm start
```

Then open `http://localhost:8080/dashboard.html`.

## Security notes

- API key is read from an environment variable, never hardcoded or committed.
- `.env` is gitignored.
- Input length is capped on `/api/generate` to guard against abuse and unnecessary API cost.
- The database (in-memory store) is not exposed directly — all access goes through validated API endpoints.

## Deployment

Built for Cloud Run: the Dockerfile uses a non-root user and respects the `$PORT` environment variable Cloud Run injects. Any container platform that follows the same convention will work.
