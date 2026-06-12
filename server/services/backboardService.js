const BACKBOARD_API_URL = 'https://app.backboard.io/api/threads/messages';

function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Backboard timeout')), ms),
  );
  return Promise.race([promise, timer]);
}

async function callBackboard(prompt, timeoutMs = 8000) {
  const apiKey = process.env.BACKBOARD_API_KEY;
  if (!apiKey) throw new Error('No API key');

  const res = await withTimeout(
    fetch(BACKBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ content: prompt }),
    }),
    timeoutMs,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backboard ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data?.content || data?.response || data?.message?.content || '').trim();
}

// ── AI-powered match selection ────────────────────────────────
// Sends the current user's profile + all candidate profiles to the AI.
// AI picks the single best match and writes the reasoning in one call.
// Returns { matchId: string, reasoning: string } or null on failure.
export async function findAndExplainMatch(user, candidates) {
  if (!candidates.length) return null;

  const profile = (p) =>
    `ID: ${p.id}
Name: ${p.name} | ${p.role} at ${p.company}
Here for: ${Array.isArray(p.intent) ? p.intent.join(' · ') : p.intent}
Can offer: ${p.give_text || p.give || ''}
Looking for: ${p.need_text || p.need || ''}`;

  const prompt = `You are a world-class conference networking curator. Your task is to find the single best person for ${user.name} to meet right now.

PERSON SEEKING A MATCH:
${profile(user)}

AVAILABLE ATTENDEES (${candidates.length} people):
${candidates.map((c) => profile(c)).join('\n\n')}

Scan every attendee above. Choose the ONE person who creates the highest mutual value. Prioritise:
1. Direct complementarity — does one person's "Can offer" directly answer the other's "Looking for"?
2. Mutual benefit — value flows BOTH ways, not just one direction
3. Intent alignment — compatible reasons for being at this event
4. Specificity — prefer concrete skill/experience overlap over vague similarity

Respond ONLY with valid JSON — no other text, no markdown:
{"matchId":"<exact ID from the list>","reasoning":"<exactly 2 sentences, warm and specific to their actual details, explains what BOTH people gain>"}`;

  try {
    const text = await callBackboard(prompt, 15000);

    // Extract JSON even if the model adds surrounding text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.matchId || !parsed.reasoning) throw new Error('Missing fields');

    // Validate the matchId actually exists in our candidate list
    const matched = candidates.find((c) => c.id === parsed.matchId);
    if (!matched) throw new Error(`Unknown matchId: ${parsed.matchId}`);

    console.log(`[AI match] ${user.name} → ${matched.name}`);
    return { candidate: matched, reasoning: parsed.reasoning };
  } catch (err) {
    console.error('[AI match failed]', err.message);
    return null;
  }
}

// ── Reasoning only (used for manual match requests) ───────────
// User already chose who to meet — AI just writes the introduction.
export async function generateReasoning(userA, userB) {
  const aGive = userA.give_text || userA.give || '';
  const aNeed = userA.need_text || userA.need || '';
  const bGive = userB.give_text || userB.give || '';
  const bNeed = userB.need_text || userB.need || '';

  const prompt = `You are a conference networking assistant. Write exactly 2 sentences explaining why these two people should meet. Be specific to their actual details. Make it feel like a warm personal introduction, not a generic recommendation. No preamble, no quotation marks.

${userA.name} (${userA.role} at ${userA.company})
Needs: ${aNeed}
Offers: ${aGive}

${userB.name} (${userB.role} at ${userB.company})
Needs: ${bNeed}
Offers: ${bGive}`;

  try {
    const text = await callBackboard(prompt, 8000);
    return text || fallbackReasoning(userA, userB);
  } catch (err) {
    console.error('[Reasoning failed]', err.message);
    return fallbackReasoning(userA, userB);
  }
}

function fallbackReasoning(a, b) {
  const aNeed = (a.need_text || a.need || '').toLowerCase();
  const bNeed = (b.need_text || b.need || '').toLowerCase();
  return `${a.name} is looking for ${aNeed} — something ${b.name} brings directly from their work at ${b.company}. In turn, ${b.name} needs ${bNeed}, and ${a.name} is well-placed to help with that.`;
}
