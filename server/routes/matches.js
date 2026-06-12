import { Router } from 'express';
import { randomUUID } from 'crypto';
import { q, serializeAttendee, serializeMatch } from '../db.js';
import { scoreCompatibility } from '../services/matchingEngine.js';
import { findAndExplainMatch, generateReasoning } from '../services/backboardService.js';

const router = Router();
const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

function randomSlot() {
  const LOCATIONS = ['Coffee bar', 'Networking lounge', 'Outdoor terrace', 'Sponsor hall', 'Quiet zone'];
  return {
    time: TIMES[Math.floor(Math.random() * TIMES.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
  };
}

function matchResponse(match) {
  return { match, status: 'found' };
}
function emptyResponse(status) {
  return { match: null, status };
}

// Automated: get next AI match
router.get('/next', async (req, res) => {
  const { userId, eventId } = req.query;
  if (!userId || !eventId) return res.status(400).json({ error: 'userId and eventId required' });

  const userRow = q.getAttendee.get(userId);
  if (!userRow) return res.status(404).json({ error: 'user not found' });

  // Return any existing pending match immediately (prevents StrictMode double-invoke)
  const existingPending = q.getPendingMatchForUser.get(eventId, userId, userId);
  if (existingPending) return res.json(matchResponse(serializeMatch(existingPending)));

  // People this user has already been presented with in this event
  const seenIds = q.getMatchesByUser.all(eventId, userId, userId)
    .map((m) => (m.attendee_a_id === userId ? m.attendee_b_id : m.attendee_a_id));

  const user = serializeAttendee(userRow);

  // Candidate pool: everyone in this event except self and already-seen
  const candidates = q.getAttendeesByEvent.all(eventId)
    .filter((r) => r.id !== userId && !seenIds.includes(r.id))
    .map((r) => serializeAttendee(r));

  if (!candidates.length) {
    // Distinguish: have they seen nobody (event is empty) or seen everyone?
    const status = seenIds.length === 0 ? 'no_candidates' : 'exhausted';
    return res.json(emptyResponse(status));
  }

  let candidate = null;
  let reasoning = '';

  // Stage 1: AI reads all profiles, picks the best match, and writes the reasoning
  const aiResult = await findAndExplainMatch(user, candidates);
  if (aiResult) {
    candidate = aiResult.candidate;
    reasoning = aiResult.reasoning;
  }

  // Stage 2: Code-based fallback — always picks someone, even if score is low.
  // A real conversation at a small event beats "no match found" every time.
  if (!candidate) {
    console.log('[Matching] AI unavailable — using code-based fallback');
    const scored = candidates
      .map((c) => ({ c, score: scoreCompatibility(user, c) }))
      .sort((a, b) => b.score - a.score);
    candidate = scored[0]?.c ?? null;
    if (!candidate) return res.json(emptyResponse('no_match'));
    reasoning = await generateReasoning(user, candidate);
  }

  const slot = randomSlot();
  const row = {
    id: randomUUID(),
    event_id: eventId,
    attendee_a_id: userId,
    attendee_b_id: candidate.id,
    reasoning,
    slot_time: slot.time,
    slot_location: slot.location,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  q.insertMatch.run(row);
  res.json(matchResponse(serializeMatch(row)));
});

// Manual: request a match with a specific attendee
router.post('/request', async (req, res) => {
  const { userId, targetId, eventId } = req.body;
  if (!userId || !targetId || !eventId) return res.status(400).json({ error: 'userId, targetId, eventId required' });

  const userRow = q.getAttendee.get(userId);
  const targetRow = q.getAttendee.get(targetId);
  if (!userRow || !targetRow) return res.status(404).json({ error: 'attendee not found' });

  const slot = randomSlot();
  const reasoning = await generateReasoning(serializeAttendee(userRow), serializeAttendee(targetRow));

  const row = {
    id: randomUUID(),
    event_id: eventId,
    attendee_a_id: userId,
    attendee_b_id: targetId,
    reasoning,
    slot_time: slot.time,
    slot_location: slot.location,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  q.insertMatch.run(row);
  res.status(201).json(serializeMatch(row));
});

// Respond to a match (accept / decline)
router.post('/:matchId/respond', (req, res) => {
  const { accept, userId } = req.body;
  const row = q.getMatch.get(req.params.matchId);
  if (!row) return res.status(404).json({ error: 'match not found' });

  const status = accept ? 'accepted' : 'declined';
  q.updateMatchStatus.run(status, row.id);
  if (accept) {
    q.updateScore.run(10, row.attendee_a_id);
    q.updateScore.run(10, row.attendee_b_id);
  }
  res.json(serializeMatch({ ...row, status }));
});

// Match history (non-pending)
router.get('/history', (req, res) => {
  const { userId, eventId } = req.query;
  const rows = q.getMatchesByUser.all(eventId, userId, userId)
    .filter((m) => m.status !== 'pending')
    .map(serializeMatch);
  res.json(rows);
});

export default router;
