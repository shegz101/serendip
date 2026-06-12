import { Router } from 'express';
import { randomUUID } from 'crypto';
import { q, serializeAttendee } from '../db.js';

const router = Router();

router.post('/', (req, res) => {
  const { event_id, name, role, company, bio, intent, give_text, need_text, available_times, tag } = req.body;
  if (!event_id || !name || !role) {
    return res.status(400).json({ error: 'event_id, name and role required' });
  }

  const existing = q.getAttendeeByTag.get(tag, event_id);
  if (existing) return res.json(serializeAttendee(existing));

  const row = {
    id: randomUUID(),
    event_id,
    name,
    role,
    company: company || '',
    bio: bio || '',
    intent: JSON.stringify(intent || []),
    give_text: give_text || '',
    need_text: need_text || '',
    available_times: JSON.stringify(available_times || []),
    tag: tag || `@${name.toLowerCase().replace(/\s+/g, '')}`,
    score: 0,
    joined_at: new Date().toISOString(),
  };

  q.insertAttendee.run(row);
  res.status(201).json(serializeAttendee(q.getAttendee.get(row.id)));
});

router.get('/event/:eventId', (req, res) => {
  const rows = q.getAttendeesByEvent.all(req.params.eventId);
  res.json(rows.map(serializeAttendee));
});

router.get('/:id', (req, res) => {
  const row = q.getAttendee.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(serializeAttendee(row));
});

export default router;
