import { Router } from 'express';
import { randomUUID } from 'crypto';
import { q } from '../db.js';

const router = Router();

router.get('/:matchId', (req, res) => {
  const rows = q.getMessagesByMatch.all(req.params.matchId);
  res.json(rows.map((m) => ({
    id: m.id,
    matchId: m.match_id,
    senderId: m.sender_id,
    text: m.text,
    sentAt: m.sent_at,
  })));
});

router.post('/:matchId', (req, res) => {
  const { senderId, text } = req.body;
  if (!senderId || !text?.trim()) {
    return res.status(400).json({ error: 'senderId and text required' });
  }
  const row = {
    id: randomUUID(),
    match_id: req.params.matchId,
    sender_id: senderId,
    text: text.trim(),
    sent_at: new Date().toISOString(),
  };
  q.insertMessage.run(row);
  res.status(201).json({
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    text: row.text,
    sentAt: row.sent_at,
  });
});

export default router;
