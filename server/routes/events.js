import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db, q } from '../db.js';

const router = Router();

const LOCATIONS = ['Main stage lounge', 'Networking terrace', 'Coffee bar', 'Sponsor hall', 'Quiet zone'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// List all active events
router.get('/', (_req, res) => {
  const events = q.listActiveEvents.all();
  const enriched = events.map((ev) => {
    const attendeeCount = db.prepare('SELECT COUNT(*) as n FROM attendees WHERE event_id = ?').get(ev.id).n;
    const matchCount = db.prepare("SELECT COUNT(*) as n FROM matches WHERE event_id = ? AND status = 'accepted'").get(ev.id).n;
    return { ...ev, attendeeCount, matchCount };
  });
  res.json(enriched);
});

// Get single event
router.get('/:id', (req, res) => {
  const ev = q.getEvent.get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'event not found' });
  const attendeeCount = db.prepare('SELECT COUNT(*) as n FROM attendees WHERE event_id = ?').get(ev.id).n;
  res.json({ ...ev, attendeeCount });
});

// Join by code
router.get('/code/:code', (req, res) => {
  const ev = q.getEventByCode.get(req.params.code.toUpperCase());
  if (!ev) return res.status(404).json({ error: 'invalid code' });
  if (new Date(ev.ends_at) < new Date()) return res.status(410).json({ error: 'event has ended' });
  const attendeeCount = db.prepare('SELECT COUNT(*) as n FROM attendees WHERE event_id = ?').get(ev.id).n;
  res.json({ ...ev, attendeeCount });
});

// Create event (organiser)
router.post('/', (req, res) => {
  const { name, organiser, company, location, description, theme, duration_hours } = req.body;
  if (!name || !organiser || !location || !duration_hours) {
    return res.status(400).json({ error: 'name, organiser, location, duration_hours required' });
  }
  const now = new Date();
  const ends = new Date(now.getTime() + Number(duration_hours) * 60 * 60 * 1000);
  const join_code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ev = {
    id: randomUUID(),
    name,
    organiser,
    company: company || '',
    location,
    description: description || '',
    theme: theme || 'Tech',
    duration_hours: Number(duration_hours),
    starts_at: now.toISOString(),
    ends_at: ends.toISOString(),
    join_code,
    created_at: now.toISOString(),
  };
  q.insertEvent.run(ev);
  res.status(201).json(ev);
});

export { LOCATIONS, TIMES };
export default router;
