import Database from 'better-sqlite3';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'serendip.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    organiser   TEXT NOT NULL,
    company     TEXT,
    location    TEXT NOT NULL,
    description TEXT,
    theme       TEXT,
    duration_hours INTEGER NOT NULL,
    starts_at   TEXT NOT NULL,
    ends_at     TEXT NOT NULL,
    join_code   TEXT UNIQUE NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendees (
    id         TEXT PRIMARY KEY,
    event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL,
    company    TEXT,
    bio        TEXT,
    intent          TEXT NOT NULL DEFAULT '[]',
    give_text       TEXT,
    need_text       TEXT,
    available_times TEXT NOT NULL DEFAULT '[]',
    tag             TEXT NOT NULL,
    score           INTEGER NOT NULL DEFAULT 0,
    joined_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id            TEXT PRIMARY KEY,
    event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendee_a_id TEXT NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    attendee_b_id TEXT NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    reasoning     TEXT,
    slot_time     TEXT,
    slot_location TEXT,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id        TEXT PRIMARY KEY,
    match_id  TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    text      TEXT NOT NULL,
    sent_at   TEXT NOT NULL
  );
`);

// ── Migrations (safe to run on every startup) ─────────────────
try {
  db.exec("ALTER TABLE attendees ADD COLUMN available_times TEXT NOT NULL DEFAULT '[]'");
} catch { /* column already exists */ }

// ── Helpers ─────────────────────────────────────────────────
export function serializeAttendee(row) {
  if (!row) return null;
  return {
    ...row,
    intent: JSON.parse(row.intent || '[]'),
    available_times: JSON.parse(row.available_times || '[]'),
  };
}

export function serializeMatch(row) {
  if (!row) return null;
  const a = serializeAttendee(
    db.prepare('SELECT * FROM attendees WHERE id = ?').get(row.attendee_a_id),
  );
  const b = serializeAttendee(
    db.prepare('SELECT * FROM attendees WHERE id = ?').get(row.attendee_b_id),
  );
  return {
    id: row.id,
    eventId: row.event_id,
    attendeeA: a,
    attendeeB: b,
    reasoning: row.reasoning,
    slot: { time: row.slot_time, location: row.slot_location },
    status: row.status,
    createdAt: row.created_at,
  };
}

// ── Prepared statements ──────────────────────────────────────
export const q = {
  // Events
  listActiveEvents: db.prepare(
    `SELECT * FROM events WHERE ends_at > datetime('now') ORDER BY starts_at ASC`,
  ),
  getEvent: db.prepare('SELECT * FROM events WHERE id = ?'),
  getEventByCode: db.prepare('SELECT * FROM events WHERE join_code = ?'),
  insertEvent: db.prepare(`
    INSERT INTO events (id,name,organiser,company,location,description,theme,duration_hours,starts_at,ends_at,join_code,created_at)
    VALUES (@id,@name,@organiser,@company,@location,@description,@theme,@duration_hours,@starts_at,@ends_at,@join_code,@created_at)
  `),
  deleteExpiredEvents: db.prepare(`DELETE FROM events WHERE ends_at <= datetime('now')`),

  // Attendees
  getAttendeesByEvent: db.prepare('SELECT * FROM attendees WHERE event_id = ? ORDER BY joined_at ASC'),
  getAttendee: db.prepare('SELECT * FROM attendees WHERE id = ?'),
  getAttendeeByTag: db.prepare('SELECT * FROM attendees WHERE tag = ? AND event_id = ?'),
  insertAttendee: db.prepare(`
    INSERT INTO attendees (id,event_id,name,role,company,bio,intent,give_text,need_text,available_times,tag,score,joined_at)
    VALUES (@id,@event_id,@name,@role,@company,@bio,@intent,@give_text,@need_text,@available_times,@tag,@score,@joined_at)
  `),
  updateScore: db.prepare('UPDATE attendees SET score = score + ? WHERE id = ?'),

  // Matches
  getPendingMatchForUser: db.prepare(`
    SELECT * FROM matches WHERE event_id = ? AND status = 'pending'
    AND (attendee_a_id = ? OR attendee_b_id = ?)
    ORDER BY created_at DESC LIMIT 1
  `),
  getMatchesByUser: db.prepare(`
    SELECT * FROM matches WHERE event_id = ?
    AND (attendee_a_id = ? OR attendee_b_id = ?)
  `),
  getMatch: db.prepare('SELECT * FROM matches WHERE id = ?'),
  insertMatch: db.prepare(`
    INSERT INTO matches (id,event_id,attendee_a_id,attendee_b_id,reasoning,slot_time,slot_location,status,created_at)
    VALUES (@id,@event_id,@attendee_a_id,@attendee_b_id,@reasoning,@slot_time,@slot_location,@status,@created_at)
  `),
  updateMatchStatus: db.prepare('UPDATE matches SET status = ? WHERE id = ?'),
  getAcceptedMatchesByEvent: db.prepare(`SELECT * FROM matches WHERE event_id = ? AND status = 'accepted'`),
  getAllMatchesByEvent: db.prepare('SELECT * FROM matches WHERE event_id = ?'),
  getAcceptedMatchForUser: db.prepare(`
    SELECT * FROM matches WHERE event_id = ? AND status = 'accepted'
    AND (attendee_a_id = ? OR attendee_b_id = ?)
    ORDER BY created_at DESC LIMIT 1
  `),

  // Messages
  getMessagesByMatch: db.prepare('SELECT * FROM messages WHERE match_id = ? ORDER BY sent_at ASC'),
  insertMessage: db.prepare(`
    INSERT INTO messages (id, match_id, sender_id, text, sent_at)
    VALUES (@id, @match_id, @sender_id, @text, @sent_at)
  `),
};

// ── Seed demo events ─────────────────────────────────────────
function seedDemoEvents() {
  const count = db.prepare('SELECT COUNT(*) as n FROM events').get();
  if (count.n > 0) return;

  const now = new Date();

  const events = [
    {
      id: randomUUID(),
      name: 'JSNation Amsterdam 2026',
      organiser: 'GitNation',
      company: 'GitNation',
      location: 'Amsterdam, Netherlands',
      description: 'The world\'s leading JavaScript conference. Meet 2,000+ JS engineers, founders, and open source maintainers.',
      theme: 'JavaScript',
      duration_hours: 48,
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      join_code: 'JSNAT26',
      created_at: now.toISOString(),
    },
    {
      id: randomUUID(),
      name: 'React Summit 2026',
      organiser: 'GitNation',
      company: 'GitNation',
      location: 'Amsterdam, Netherlands',
      description: 'The biggest React conference worldwide. Frontend engineers, product teams, and React core contributors.',
      theme: 'React',
      duration_hours: 72,
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      join_code: 'REACT26',
      created_at: now.toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Progress x GitNation Hackathon',
      organiser: 'Progress Software',
      company: 'Progress',
      location: 'Amsterdam, Netherlands',
      description: 'A 24-hour hackathon building the future of tech events. Teams, mentors, and €10,000 in prizes.',
      theme: 'Hackathon',
      duration_hours: 24,
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      join_code: 'HACK26',
      created_at: now.toISOString(),
    },
  ];

  const seedAttendees = [
    { role: 'Engineer', name: 'Maya Chen', company: 'Vercel', intent: ['Share knowledge'], give_text: 'Deep expertise in auth systems at scale', need_text: 'Interesting problems and potential angel investments', bio: 'Staff engineer, led auth infra for 3 years' },
    { role: 'Founder', name: 'James Okafor', company: 'AuthBase', intent: ['Get feedback', 'Find a co-founder'], give_text: 'Early access to AuthBase, technical collaboration', need_text: 'Someone who has done auth at scale and is open to advising', bio: 'Building developer auth infrastructure' },
    { role: 'Recruiter', name: 'Sarah Kim', company: 'Linear', intent: ['Hiring'], give_text: 'Job opportunities at a fast-growing dev tools company', need_text: 'Senior React/TypeScript engineers with product taste', bio: 'Head of engineering hiring at Linear' },
    { role: 'Engineer', name: 'David Mensah', company: 'Freelance', intent: ['Job hunting'], give_text: 'Strong React + TypeScript skills, 3 production apps', need_text: 'A senior role at a dev tools or infrastructure company', bio: '5 years React, looking for next role' },
    { role: 'VC', name: 'Priya Nair', company: 'Seedcamp', intent: ['Meet potential customers'], give_text: 'Pre-seed / seed funding, European startup network', need_text: 'Developer tools founders raising their first round', bio: 'Seed investor focused on developer tools' },
  ];

  for (const ev of events) {
    q.insertEvent.run(ev);
    for (const a of seedAttendees) {
      q.insertAttendee.run({
        id: randomUUID(),
        event_id: ev.id,
        name: a.name,
        role: a.role,
        company: a.company || '',
        bio: a.bio || '',
        intent: JSON.stringify(a.intent),
        give_text: a.give_text,
        need_text: a.need_text,
        tag: `@${a.name.toLowerCase().replace(/\s+/g, '')}`,
        score: Math.floor(Math.random() * 30),
        joined_at: new Date().toISOString(),
      });
    }
  }

  console.log('✓ Seeded 3 demo events with attendees');
}

seedDemoEvents();

// ── Cleanup job ──────────────────────────────────────────────
export function runCleanup() {
  const { changes } = q.deleteExpiredEvents.run();
  if (changes > 0) console.log(`Cleaned up ${changes} expired event(s)`);
}
