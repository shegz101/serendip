import { q, serializeAttendee } from '../db.js';

const COMPLEMENTARY_PAIRS = [
  ['Hiring', 'Job hunting'],
  ['Find a co-founder', 'Find a co-founder'],
  ['Raise money', 'Meet potential customers'],
  ['Get feedback', 'Share knowledge'],
  ['Learn', 'Share knowledge'],
];

const ROLE_PAIR_SCORES = {
  'Recruiter-Engineer': 4, 'Engineer-Recruiter': 4,
  'Founder-VC': 5, 'VC-Founder': 5,
  'Founder-Engineer': 3, 'Engineer-Founder': 3,
  'Founder-Designer': 2, 'Speaker-Engineer': 1,
  'Engineer-Engineer': 1,
};

function intentScore(a, b) {
  let score = 0;
  const aIntents = Array.isArray(a.intent) ? a.intent : JSON.parse(a.intent || '[]');
  const bIntents = Array.isArray(b.intent) ? b.intent : JSON.parse(b.intent || '[]');
  for (const [x, y] of COMPLEMENTARY_PAIRS) {
    if ((aIntents.includes(x) && bIntents.includes(y)) ||
        (aIntents.includes(y) && bIntents.includes(x))) score += 3;
  }
  return score;
}

function roleScore(a, b) {
  return ROLE_PAIR_SCORES[`${a.role}-${b.role}`] || 0;
}

function needGiveScore(a, b) {
  const aNeed = (a.need_text || a.need || '').toLowerCase().split(/\W+/);
  const bGive = (b.give_text || b.give || '').toLowerCase().split(/\W+/);
  const bNeed = (b.need_text || b.need || '').toLowerCase().split(/\W+/);
  const aGive = (a.give_text || a.give || '').toLowerCase().split(/\W+/);
  const sig = (w) => w.length > 3;
  const overlap1 = aNeed.filter((w) => sig(w) && bGive.includes(w)).length;
  const overlap2 = bNeed.filter((w) => sig(w) && aGive.includes(w)).length;
  return (overlap1 + overlap2) * 2;
}

export function scoreCompatibility(a, b) {
  return intentScore(a, b) + roleScore(a, b) + needGiveScore(a, b);
}

export function findBestMatch(userId, eventId, seenIds = []) {
  const userRow = q.getAttendee.get(userId);
  if (!userRow) return null;
  const user = serializeAttendee(userRow);

  const candidates = q.getAttendeesByEvent.all(eventId)
    .filter((r) => r.id !== userId && !seenIds.includes(r.id))
    .map((r) => ({ attendee: serializeAttendee(r), score: scoreCompatibility(user, serializeAttendee(r)) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.attendee || null;
}
