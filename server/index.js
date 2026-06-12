import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runCleanup } from './db.js';
import eventsRouter from './routes/events.js';
import profilesRouter from './routes/profiles.js';
import matchesRouter from './routes/matches.js';
import dashboardRouter from './routes/dashboard.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

const corsOptions = { origin: allowedOrigins, credentials: true };
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for every route
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Hourly cleanup of expired events
runCleanup();
setInterval(runCleanup, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\n🚀 Serendip server → http://localhost:${PORT}`);
  if (!process.env.BACKBOARD_API_KEY) console.warn('⚠  BACKBOARD_API_KEY not set');
});
