import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/session';
import { api } from '../lib/api';
import type { SerendipEvent } from '../lib/types';

// ── Countdown ────────────────────────────────────────────────
function useCountdown(endsAt: string) {
  const calc = () => {
    const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, done: diff === 0 };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return t;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const { h, m, s, done } = useCountdown(endsAt);
  if (done) return <span className="text-danger text-xs font-semibold">Ended</span>;
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      {[{ v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }].map(({ v, l }) => (
        <span key={l} className="flex items-center gap-0.5">
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-semibold min-w-[22px] text-center">{String(v).padStart(2, '0')}</span>
          <span className="text-white/30">{l}</span>
        </span>
      ))}
    </div>
  );
}

// ── Cycling headline word ────────────────────────────────────
const CYCLING_WORDS = ['co-founder', 'investor', 'mentor', 'first customer', 'dream job', 'technical partner'];

function CyclingWord() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx((i) => (i + 1) % CYCLING_WORDS.length); setVisible(true); }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  return (
    <span
      className="bg-gradient-brand bg-clip-text text-transparent transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {CYCLING_WORDS[idx]}
    </span>
  );
}

// ── Theme badge ──────────────────────────────────────────────
const THEME_COLORS: Record<string, string> = {
  JavaScript: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  React: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  Hackathon: 'bg-brand-500/15 text-brand-300 border-brand-500/25',
  Tech: 'bg-white/10 text-white/60 border-white/15',
};

function ThemeBadge({ theme }: { theme?: string }) {
  const cls = THEME_COLORS[theme || 'Tech'] || THEME_COLORS.Tech;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{theme || 'Tech'}</span>;
}

// ── Event card ───────────────────────────────────────────────
function EventCard({ event }: { event: SerendipEvent }) {
  const navigate = useNavigate();
  return (
    <div className="glass-card p-5 flex flex-col gap-4 hover:border-white/15 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ThemeBadge theme={event.theme} />
          </div>
          <h3 className="font-semibold text-sm text-white leading-snug truncate">{event.name}</h3>
          <p className="text-xs text-white/40 mt-0.5 truncate">📍 {event.location}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[9px] text-white/30 mb-1">ends in</div>
          <Countdown endsAt={event.ends_at} />
        </div>
      </div>

      {event.description && (
        <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-white/35">
          <span>👥 {event.attendeeCount ?? 0} joined</span>
          {(event.matchCount ?? 0) > 0 && <span>🤝 {event.matchCount} matched</span>}
        </div>
        <button
          onClick={() => navigate(`/dashboard/${event.id}`)}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors px-2 py-1 border border-white/10 rounded-lg"
        >
          Dashboard
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
        <span className="text-white/20 text-[10px]">🔒</span>
        <span className="text-[10px] text-white/25">Join with your organiser's code above</span>
      </div>
    </div>
  );
}

// ── Main Landing ─────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const session = getSession();
  const [events, setEvents] = useState<SerendipEvent[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const scrollEvents = (dir: 'left' | 'right') => {
    eventsScrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    api.listEvents().then(setEvents).catch(() => {});
  }, []);

  const handleCodeJoin = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError('');
    try {
      const event = await api.getEventByCode(codeInput.trim().toUpperCase());
      navigate(`/onboarding?eventId=${event.id}`);
    } catch {
      setCodeError('Event not found. Check your code.');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink">

      {/* ── Atmosphere ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/4 w-[900px] h-[700px] rounded-full bg-brand-500/12 blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-brand-700/8 blur-[100px]" />
        <div className="absolute top-[45%] right-[-5%] w-[350px] h-[350px] rounded-full bg-spark/6 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Serendip</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/event/create')} className="btn-ghost text-sm px-4 py-2 hidden md:block">
            Create event
          </button>
          {session ? (
            <button onClick={() => navigate('/matches')} className="btn-primary text-sm px-5 py-2.5">
              My matches →
            </button>
          ) : (
            <button onClick={() => navigate('/onboarding')} className="btn-primary text-sm px-5 py-2.5">
              Join event →
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-6 md:px-10 pt-14 md:pt-20 pb-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-start">

          {/* Left: headline + code input */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 mb-8 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-spark animate-pulse" />
              <span className="text-xs font-medium text-brand-300">Progress × GitNation · Amsterdam 2026</span>
            </div>

            <h1 className="text-[clamp(2.6rem,6vw,5.5rem)] font-bold leading-[1.04] tracking-[-2.5px] mb-6 animate-fade-up">
              <span className="text-white/90">Your</span>{' '}
              <CyclingWord />{' '}
              <br />
              <span className="text-white/90">is in the room.</span>
              <br />
              <span className="text-white/30 text-[0.55em] font-medium tracking-normal leading-loose">
                They just don't know you exist yet.
              </span>
            </h1>

            <p className="text-base md:text-lg text-white/45 max-w-lg leading-relaxed mb-10 animate-fade-up-delay">
              Serendip taps you on the shoulder — 3 times a day — with one
              specific person who can move your career forward. AI picks them.
              You meet them. That's it.
            </p>

            {/* Code join */}
            <div className="animate-fade-up-delay-2">
              <p className="text-xs text-white/35 mb-3 font-medium tracking-wide uppercase">Have an event code?</p>
              <div className="flex gap-2 max-w-sm">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeJoin()}
                  placeholder="JSNAT26"
                  maxLength={8}
                  className="flex-1 bg-white/[0.05] border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-brand-400/50 focus:bg-white/[0.07] transition-all"
                />
                <button
                  onClick={handleCodeJoin}
                  disabled={codeLoading || !codeInput.trim()}
                  className="btn-primary px-5 py-3 text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {codeLoading ? '…' : 'Enter →'}
                </button>
              </div>
              {codeError && <p className="text-danger text-xs mt-2">{codeError}</p>}
            </div>

            {/* Organiser CTA */}
            <div className="mt-6 flex items-center gap-3 animate-fade-up-delay-2">
              <div className="h-px flex-1 bg-white/[0.05]" />
              <span className="text-xs text-white/25">or</span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>
            <button
              onClick={() => navigate('/event/create')}
              className="mt-4 btn-ghost text-sm px-6 py-3 w-full max-w-sm"
            >
              I'm an organiser — create my event →
            </button>
          </div>

          {/* Right: floating match card */}
          <div className="hidden lg:flex justify-center items-start pt-4">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/15 blur-3xl rounded-3xl scale-105" />
              <div className="relative glass-card shadow-card p-6 w-[360px] animate-float">
                <div className="flex items-center justify-between mb-5">
                  <span className="section-label text-[10px]">Your 13:00 match</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-white/40">Live</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xl font-bold text-white shadow-lg flex-shrink-0 w-12 h-12">M</div>
                  <div>
                    <div className="font-semibold text-white">Maya Chen</div>
                    <div className="text-xs text-white/50 mt-0.5">Staff Eng · Vercel</div>
                    <span className="tag text-[9px] px-1.5 py-0.5 mt-1 inline-block">Share knowledge</span>
                  </div>
                </div>
                <div className="relative bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 mb-4">
                  <div className="absolute -top-2.5 left-4 bg-ink-soft px-2 py-0.5 rounded-full border border-white/[0.06]">
                    <span className="text-[9px] text-brand-400 font-semibold">✦ AI reasoning</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed mt-1">"She led auth infra at Vercel for 3 years. You're building an auth startup. She's open to advising."</p>
                </div>
                <div className="text-[10px] text-white/35 mb-4 flex items-center gap-1.5 bg-white/[0.03] px-3 py-2 rounded-lg">
                  <span>🕐</span><span>Suggested time: 13:15 · Look for @mayachen</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 btn-primary py-2.5 text-xs">✅ I'm in</button>
                  <button className="flex-1 btn-ghost py-2.5 text-xs">🔄 Next time</button>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-spark text-ink text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">AI-matched</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="relative z-10 border-y border-white/[0.05] bg-white/[0.015] py-6 my-2">
        <div className="max-w-3xl mx-auto flex items-center justify-around px-6 flex-wrap gap-6">
          {[{ n: '3×', l: 'Daily taps' }, { n: '1', l: 'Person at a time' }, { n: '<30s', l: 'To onboard' }, { n: '100%', l: 'AI reasoning' }].map(({ n, l }) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">{n}</div>
              <div className="text-xs text-white/30 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Events ── */}
      <section className="relative z-10 px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="section-label mb-2">Live now</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Active events</h2>
          </div>
          <div className="flex items-center gap-3">
            {events.length > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => scrollEvents('left')}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Previous events"
                >
                  ←
                </button>
                <button
                  onClick={() => scrollEvents('right')}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Next events"
                >
                  →
                </button>
              </div>
            )}
            <button onClick={() => navigate('/event/create')} className="btn-ghost text-sm px-4 py-2 hidden sm:block">
              + Create yours
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="text-3xl mb-3">🎪</div>
            <p className="text-white/40 text-sm">No active events yet.</p>
            <button onClick={() => navigate('/event/create')} className="btn-primary mt-4 text-sm px-6 py-2.5">Create the first one →</button>
          </div>
        ) : (
          <div
            ref={eventsScrollRef}
            className="flex gap-4 overflow-x-auto pb-3"
            style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
          >
            {events.map((ev) => (
              <div key={ev.id} style={{ minWidth: '300px', maxWidth: '340px', flex: '0 0 auto', scrollSnapAlign: 'start' }}>
                <EventCard event={ev} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="section-label mb-3">Two modes</div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">You pick how you connect</h2>
            <p className="text-white/45 text-sm leading-relaxed mb-8">
              Some people want control. Others want to be surprised. Serendip gives you both.
            </p>
            <div className="space-y-4">
              {[
                { icon: '⚡', title: 'Automated', sub: 'Let AI pick', desc: 'Serendip analyses everyone\'s intents and surfaces the one person who completes your picture. You just say yes or no.' },
                { icon: '🔍', title: 'Manual browse', sub: 'You choose', desc: 'Browse all attendees in your event, read their profiles, and request a match with anyone you find interesting.' },
              ].map((m) => (
                <div key={m.title} className="glass-card p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-lg flex-shrink-0">{m.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{m.title}</span>
                      <span className="text-[10px] text-white/35 bg-white/[0.05] px-2 py-0.5 rounded-full">{m.sub}</span>
                    </div>
                    <p className="text-xs text-white/45 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="section-label mb-4">For organisers</div>
            {[
              { label: 'Matches made', value: '47', sub: '+12 this hour', c: 'text-success' },
              { label: 'Acceptance rate', value: '78%', sub: 'Above event average', c: 'text-spark' },
              { label: 'Needs attention', value: '3', sub: 'Attendees with 0 matches', c: 'text-danger' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/35">{s.label}</div>
                  <div className="text-2xl font-bold mt-0.5">{s.value}</div>
                </div>
                <span className={`text-xs font-medium ${s.c}`}>{s.sub}</span>
              </div>
            ))}
            <p className="text-xs text-white/25 text-center mt-2 px-2">
              Find your event in the list above → Dashboard button
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 md:px-10 py-20 text-center max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
          Stop eating lunch alone.
          <br />
          <span className="bg-gradient-brand bg-clip-text text-transparent">Let it find you.</span>
        </h2>
        <p className="text-white/40 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          30 seconds to onboard. No account. No password. Just what you need and what you give.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/onboarding')} className="btn-primary px-10 py-4 text-base shadow-glow">
            Join an event →
          </button>
          <button onClick={() => navigate('/event/create')} className="btn-ghost px-10 py-4 text-base">
            Create an event
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 px-6 md:px-10 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-brand flex items-center justify-center"><span className="text-white text-[9px] font-bold">S</span></div>
          <span>Serendip · getserendip.xyz</span>
        </div>
        <span>Built for Progress × GitNation Hackathon 2026</span>
      </footer>
    </div>
  );
}
