# Serendip

> **Turn every conference into a room full of people who already want to meet you.**

Serendip is a real-time, AI-powered networking app built for live events. Attendees answer four questions about who they are, what they can give, and what they need — then the AI matches them with the single best person in the room and tells them exactly why they should meet. No swiping. No scrolling. No awkward cold intros.

Built in 24 hours at the **Progress × GitNation Hackathon, Amsterdam 2026**, using the mandatory KendoReact component library as the core UI backbone.

---

## Product Hook

Most networking apps are discovery tools — they show you a list of people and let you figure out the rest. Serendip does the opposite: it reads the room, understands intent, and surfaces one high-signal match at a time, with a plain-English reason written by an AI that read both your profiles.

The flow is deliberately frictionless:
1. Organiser creates an event → gets a private 6-character join code
2. Attendees join via the code (no account, no password, no OAuth)
3. A four-question onboarding captures role, intent, what they give, what they need
4. AI matches them against every other attendee in real time
5. Accept the match → find each other by `@tag`

The result: meaningful introductions happen in the first ten minutes, not the last ten.

---

## Features

### For Attendees
- **Zero-friction onboarding** — name, role, intent, give/need in four steps; generates a unique `@tag` automatically
- **AI-first matching** — Backboard AI (GPT-4o) reads all attendee profiles simultaneously and picks the single best match with a human-readable explanation of why you should meet
- **Smart fallback** — if AI is unavailable, a deterministic compatibility engine (intent pairs × role affinity × keyword overlap) selects the best available candidate; no attendee is ever left without a match
- **Three honest empty states** — "You're the first here" / "You've met everyone" / "Looking for the right match" — no false promises
- **Match acceptance flow** — Accept or decline; accepted matches show the person's `@tag` prominently so you can walk up and say "Are you @mayachen?"
- **Browse mode** — manually explore all attendees in the event with expandable profiles, and request a match with anyone
- **Time slot preferences** — declare when you're free to meet (Morning / Midday / Afternoon / Evening / Anytime) during onboarding
- **Serendip Score** — a lightweight reputation signal that increments when matches are accepted

### For Organisers
- **Event creation** — name, location, description, theme, duration; generates a unique join code
- **Private join code** — hidden from the public event listing; revealed only behind a click-to-reveal toggle on the dashboard
- **Live dashboard** — real-time stats on attendees, matches made, acceptance rate, and activity over time
- **Needs attention** — highlights attendees who haven't been matched yet
- **Top connectors leaderboard** — shows the most-connected attendees and their Serendip Score
- **Attendee cards** — colour-coded, role-tagged, intent-labelled cards for every person in the event

### Platform
- **Event auto-expiry** — events delete themselves (and all associated data) when `ends_at` is reached; hourly server-side cleanup job
- **Code-only entry** — events are publicly listable for discovery but join requires the organiser's code
- **No authentication** — session lives in `localStorage` under `serendip_session_v2`; attendees are identified by `@tag` scoped to each event

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript + Vite 8 |
| UI components | KendoReact 15 (Buttons, Inputs, DropDownList, MultiSelect, Charts, Indicators) |
| Styling | Tailwind CSS v3 + custom design tokens (brand, spark, success, danger) |
| Routing | React Router v7 |
| Backend | Node.js + Express 4 |
| Database | SQLite via `better-sqlite3` (WAL mode, FK cascade delete) |
| AI matching | Backboard AI (GPT-4o proxy) via REST |
| Dev proxy | Vite `/api` → `localhost:3001` |

---

## Architecture

```
serendip/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx       # Public homepage + event carousel
│   │   │   ├── Onboarding.tsx    # 4-step attendee registration
│   │   │   ├── Matches.tsx       # AI match display + accept/decline
│   │   │   ├── Browse.tsx        # Manual attendee discovery
│   │   │   ├── EventCreate.tsx   # Organiser event creation form
│   │   │   └── Dashboard.tsx     # Live organiser dashboard
│   │   ├── components/
│   │   │   └── MatchCard/        # Reusable match display card
│   │   └── lib/
│   │       ├── api.ts            # Typed API client (all fetch calls)
│   │       ├── session.ts        # localStorage session helpers
│   │       └── types.ts          # Shared TypeScript interfaces
│   └── vite.config.ts            # Dev proxy: /api → :3001
│
└── server/                   # Express + SQLite backend
    ├── index.js                  # Server bootstrap + hourly cleanup
    ├── db.js                     # Schema, migrations, prepared statements, seed
    ├── routes/
    │   ├── events.js             # GET /api/events, POST, GET /:id, GET /code/:code
    │   ├── profiles.js           # POST /api/profiles (register attendee)
    │   ├── matches.js            # GET /next, POST /request, POST /:id/respond
    │   └── dashboard.js          # GET /api/dashboard/:eventId (stats)
    └── services/
        ├── backboardService.js   # Backboard AI calls (findAndExplainMatch, generateReasoning)
        └── matchingEngine.js     # Code-based compatibility scoring (fallback)
```

### Data Model

```
events
  id, name, organiser, company, location, description, theme
  duration_hours, starts_at, ends_at, join_code (UNIQUE), created_at

attendees  (event-scoped; CASCADE DELETE on event)
  id, event_id, name, role, company, bio
  intent (JSON array), give_text, need_text
  available_times (JSON array), tag, score, joined_at

matches  (CASCADE DELETE on event or attendee)
  id, event_id, attendee_a_id, attendee_b_id
  reasoning, slot_time, slot_location, status, created_at
```

### Matching Pipeline

Every call to `GET /api/matches/next` runs this pipeline:

```
1. Return existing pending match if one exists (idempotent for StrictMode double-invokes)
2. Build candidate pool: all attendees in this event except self and already-seen
3. Empty pool?
   ├── seenIds empty → status: "no_candidates"  (first person in event)
   └── seenIds non-empty → status: "exhausted"  (met everyone)
4. Stage 1 — AI matching (Backboard / GPT-4o, 15 s timeout):
   Send full profiles of user + all candidates in one prompt.
   AI returns { matchId, reasoning } — structured JSON extracted via regex fallback.
   Validate matchId against actual candidate list (prevents hallucination).
5. Stage 2 — Code-based fallback (if AI fails/times out):
   score = intentScore + roleScore + needGiveScore
   intentScore: checks COMPLEMENTARY_PAIRS (Hiring↔Job hunting, Founder↔VC, etc.)
   roleScore: fixed bonuses for high-signal role combos (VC-Founder = 5 pts)
   needGiveScore: keyword overlap between a.need_text and b.give_text (bi-directional)
   Always picks the highest-scored candidate — never returns empty when candidates exist.
6. Insert match row (status: pending) → return { match, status: "found" }
```

### Session Model

No server-side sessions. After registration the client stores:

```json
{
  "userId": "uuid",
  "eventId": "uuid",
  "tag": "@mayachen",
  "name": "Maya Chen",
  "eventName": "JSNation Amsterdam 2026"
}
```

Key: `serendip_session_v2` in `localStorage`. Protected routes (`/matches`, `/browse`) redirect to `/onboarding` if session is absent.

### Event Lifecycle

```
Organiser creates event → join_code generated (e.g. JSNAT26)
Attendees join via code → event visible on landing but code is private
Event ends_at passes → server cleanup job deletes event + all attendees + all matches
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A Backboard AI API key (for AI matching; app works without it using code-based fallback)
- A KendoReact license key (trial or commercial)

### Setup

```bash
# Clone
git clone https://github.com/shegz101/serendip.git
cd serendip

# Backend
cd server
cp .env.example .env          # fill in BACKBOARD_API_KEY
npm install
npm run dev                    # starts on :3001, auto-seeds 3 demo events

# Frontend (new terminal)
cd ../client
cp .env.local.example .env.local    # fill in VITE_KENDO_LICENSE_KEY
npm install
npm run dev                    # starts on :5173 with /api proxy
```

Open `http://localhost:5173`.

### Environment Variables

**`server/.env`**
```
BACKBOARD_API_KEY=your_key_here
PORT=3001
```

**`client/.env.local`**
```
VITE_KENDO_LICENSE_KEY=your_key_here
```

### Demo Events (auto-seeded)

On first run the server seeds three active events with five attendees each:

| Event | Join Code |
|---|---|
| JSNation Amsterdam 2026 | `JSNAT26` |
| React Summit 2026 | `REACT26` |
| Progress × GitNation Hackathon | `HACK26` |

Use any of these codes on the homepage to skip organiser onboarding and test the attendee flow directly.

### Test Flow

1. Go to `http://localhost:5173`
2. Enter `JSNAT26` in the join code box → click **Find**
3. Complete the 4-step onboarding (name, role, intent, give/need)
4. Land on the Matches page — AI selects your best match with reasoning
5. Accept → see the `@tag` prompt to find them at the event
6. Visit `http://localhost:5173/browse` to manually discover other attendees

**Organiser flow:**
1. Click **Create an event** on the landing page
2. Fill in event details → submit
3. Copy the join code and share it with attendees
4. Open the dashboard from the event card → click 👁 to reveal the join code

### Build for Production

```bash
# Frontend
cd client && npm run build    # outputs to client/dist/

# Backend — serve client/dist/ as static files and proxy /api to the Express server
# (add express.static middleware or use a reverse proxy such as nginx/caddy)
cd server && npm start
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events` | List active events (join code hidden) |
| `POST` | `/api/events` | Create an event |
| `GET` | `/api/events/:id` | Get event by ID |
| `GET` | `/api/events/code/:code` | Look up event by join code |
| `POST` | `/api/profiles` | Register an attendee |
| `GET` | `/api/profiles/event/:eventId` | All attendees in an event |
| `GET` | `/api/matches/next` | Get next AI match for a user |
| `POST` | `/api/matches/request` | Manual match request |
| `POST` | `/api/matches/:id/respond` | Accept or decline a match |
| `GET` | `/api/matches/history` | Past (non-pending) matches |
| `GET` | `/api/dashboard/:eventId` | Organiser stats |
| `GET` | `/api/health` | Health check |

---

## Contributing

Pull requests are welcome. Open an issue first for anything beyond small fixes.

---

## License

MIT
