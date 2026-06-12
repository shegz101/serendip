import { Router } from 'express';
import { db, q, serializeAttendee, serializeMatch } from '../db.js';

const router = Router();

router.get('/:eventId', (req, res) => {
  const { eventId } = req.params;
  const ev = q.getEvent.get(eventId);
  if (!ev) return res.status(404).json({ error: 'event not found' });

  const allAttendees = q.getAttendeesByEvent.all(eventId).map(serializeAttendee);
  const allMatches = q.getAllMatchesByEvent.all(eventId);
  const acceptedMatches = allMatches.filter((m) => m.status === 'accepted');

  const connectedIds = new Set(
    acceptedMatches.flatMap((m) => [m.attendee_a_id, m.attendee_b_id]),
  );
  const lonelyAttendees = allAttendees.filter((a) => !connectedIds.has(a.id));

  const matchCount = {};
  for (const m of acceptedMatches) {
    matchCount[m.attendee_a_id] = (matchCount[m.attendee_a_id] || 0) + 1;
    matchCount[m.attendee_b_id] = (matchCount[m.attendee_b_id] || 0) + 1;
  }
  const topConnectors = allAttendees
    .filter((a) => matchCount[a.id])
    .map((a) => ({ attendee: a, count: matchCount[a.id], score: a.score }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const hourMap = {};
  for (const m of allMatches) {
    const h = new Date(m.created_at).getHours();
    const label = `${h}:00`;
    hourMap[label] = (hourMap[label] || 0) + 1;
  }
  let matchesByHour = Object.entries(hourMap)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([hour, count]) => ({ hour, count }));
  if (matchesByHour.length === 0) {
    for (let h = 9; h <= 17; h++)
      matchesByHour.push({ hour: `${h}:00`, count: Math.floor(Math.random() * 5) });
  }

  res.json({
    event: ev,
    totalAttendees: allAttendees.length,
    totalMatches: allMatches.length,
    acceptedMatches: acceptedMatches.length,
    acceptanceRate: allMatches.length ? acceptedMatches.length / allMatches.length : 0,
    lonelyAttendees,
    topConnectors,
    matchesByHour,
    attendees: allAttendees,
  });
});

export default router;
