import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runCleanup } from './db.js';
import eventsRouter from './routes/events.js';
import profilesRouter from './routes/profiles.js';
import matchesRouter from './routes/matches.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/dashboard', dashboardRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Hourly cleanup of expired events
runCleanup();
setInterval(runCleanup, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\n🚀 Serendip server → http://localhost:${PORT}`);
  if (!process.env.BACKBOARD_API_KEY) console.warn('⚠  BACKBOARD_API_KEY not set');
});
