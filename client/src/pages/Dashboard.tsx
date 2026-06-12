import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Chart, ChartSeries, ChartSeriesItem,
  ChartCategoryAxis, ChartCategoryAxisItem,
  ChartValueAxis, ChartValueAxisItem,
  ChartTooltip,
} from '@progress/kendo-react-charts';
import { Loader } from '@progress/kendo-react-indicators';
import { api } from '../lib/api';
import type { DashboardStats, Attendee } from '../lib/types';

import 'hammerjs';

function useCountdown(endsAt?: string) {
  const calc = () => {
    if (!endsAt) return { h: 0, m: 0, s: 0, done: true };
    const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
    return {
      h: Math.floor(diff / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
      done: diff === 0,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return t;
}

const AVATAR_COLORS = [
  'from-purple-500 to-brand-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function AttendeeCard({
  attendee,
  matchCount,
  connected,
}: {
  attendee: Attendee;
  matchCount: number;
  connected: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 p-4 group">
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(attendee.name)} flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-lg`}>
        {attendee.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + tag */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-white truncate">{attendee.name}</span>
          <span className="text-[10px] text-white/25 font-mono shrink-0">{attendee.tag}</span>
        </div>

        {/* Role · Company */}
        <div className="text-xs text-white/45 mb-2 truncate">
          {attendee.role}
          {attendee.company && attendee.company !== 'Independent' && (
            <span className="text-white/25"> · {attendee.company}</span>
          )}
        </div>

        {/* Intent chips — max 2 */}
        {attendee.intent.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {attendee.intent.slice(0, 2).map((i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/15">
                {i}
              </span>
            ))}
            {attendee.intent.length > 2 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30">
                +{attendee.intent.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Footer: matches + status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30">
            {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches yet'}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${
              connected
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-white/[0.05] text-white/35 border-white/[0.08]'
            }`}
          >
            {connected ? '✓ Connected' : 'Waiting'}
          </span>
        </div>
      </div>
    </div>
  );
}

const STAT_CARDS = (stats: DashboardStats) => [
  { label: 'Attendees', value: stats.totalAttendees, icon: '👥', color: 'text-white' },
  { label: 'Matches made', value: stats.totalMatches, icon: '🤝', color: 'text-brand-300' },
  { label: 'Accepted', value: stats.acceptedMatches, icon: '✅', color: 'text-success' },
  { label: 'Acceptance rate', value: `${Math.round(stats.acceptanceRate * 100)}%`, icon: '📈', color: 'text-spark' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [codeVisible, setCodeVisible] = useState(false);

  const countdown = useCountdown(stats?.event?.ends_at);

  useEffect(() => {
    if (!eventId) return;
    api.getDashboard(eventId)
      .then(setStats)
      .catch(() => setError('Event not found or has expired.'))
      .finally(() => setLoading(false));

    const id = setInterval(() => {
      api.getDashboard(eventId!).then(setStats).catch(() => {});
    }, 10_000);
    return () => clearInterval(id);
  }, [eventId]);

  const gridData = stats
    ? (stats.attendees ?? []).map((a) => {
        const connector = stats.topConnectors.find((tc) => tc.attendee.id === a.id);
        return {
          ...a,
          matches: connector?.count ?? 0,
          status: connector ? 'Connected' : 'Needs match',
        };
      })
    : [];

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[600px] h-[400px] rounded-full bg-brand-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-spark/4 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.05]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold">Serendip</span>
        </button>
        <div className="section-label">Organiser Dashboard</div>
        <button
          onClick={() => navigate(eventId ? `/onboarding?eventId=${eventId}` : '/onboarding')}
          className="btn-primary text-sm px-4 py-2"
        >
          Join as attendee →
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader size="large" type="pulsing" themeColor="primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/50">{error}</p>
            <button onClick={() => navigate('/')} className="btn-ghost mt-6">Back to home</button>
          </div>
        )}

        {stats && (
          <>
            {/* Event header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="section-label mb-1">Live event</div>
                <h1 className="text-2xl font-bold">{stats.event.name}</h1>
                <p className="text-white/40 text-sm mt-1">
                  📍 {stats.event.location} · Organiser: {stats.event.organiser}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] text-white/30 mb-1">join code</div>
                  <button
                    onClick={() => setCodeVisible((v) => !v)}
                    className="flex items-center gap-2 group"
                    title={codeVisible ? 'Hide code' : 'Reveal join code'}
                  >
                    <span className={`font-mono text-lg font-bold tracking-widest transition-all ${codeVisible ? 'text-brand-300' : 'text-white/0 blur-sm select-none'}`}
                      style={{ textShadow: codeVisible ? undefined : '0 0 10px rgba(160,126,255,0.8)' }}
                    >
                      {stats.event.join_code}
                    </span>
                    <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors">
                      {codeVisible ? '🙈' : '👁'}
                    </span>
                  </button>
                </div>
                <div className="text-right border-l border-white/[0.08] pl-4">
                  <div className="text-[10px] text-white/30 mb-1">
                    {countdown.done ? 'ended' : 'ends in'}
                  </div>
                  {countdown.done ? (
                    <span className="text-danger text-sm font-semibold">Ended</span>
                  ) : (
                    <div className="flex items-center gap-1 font-mono text-sm">
                      {[{ v: countdown.h, l: 'h' }, { v: countdown.m, l: 'm' }, { v: countdown.s, l: 's' }].map(({ v, l }) => (
                        <span key={l} className="flex items-center gap-0.5">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-semibold min-w-[22px] text-center">
                            {String(v).padStart(2, '0')}
                          </span>
                          <span className="text-white/30">{l}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {STAT_CARDS(stats).map((s) => (
                <div key={s.label} className="glass-card p-5">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-white/40">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Matches over time chart */}
              <div className="lg:col-span-2 glass-card p-6">
                <div className="section-label mb-4">Matches over time</div>
                {stats.matchesByHour.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-white/25 text-sm">
                    No matches yet — they'll appear here in real time
                  </div>
                ) : (
                  <Chart style={{ height: 220 }}>
                    <ChartCategoryAxis>
                      <ChartCategoryAxisItem
                        categories={stats.matchesByHour.map((d) => d.hour)}
                        labels={{ color: 'rgba(255,255,255,0.4)', font: '11px Inter' }}
                        majorGridLines={{ color: 'rgba(255,255,255,0.05)' }}
                      />
                    </ChartCategoryAxis>
                    <ChartValueAxis>
                      <ChartValueAxisItem
                        labels={{ color: 'rgba(255,255,255,0.4)', font: '11px Inter' }}
                        majorGridLines={{ color: 'rgba(255,255,255,0.05)' }}
                      />
                    </ChartValueAxis>
                    <ChartSeries>
                      <ChartSeriesItem
                        type="area"
                        data={stats.matchesByHour.map((d) => d.count)}
                        color="#6B3EE8"
                        opacity={0.3}
                        line={{ color: '#A07EFF', width: 2 }}
                      />
                    </ChartSeries>
                    <ChartTooltip />
                  </Chart>
                )}
              </div>

              {/* Needs attention */}
              <div className="glass-card p-6">
                <div className="section-label mb-4 flex items-center gap-2">
                  Needs attention
                  {stats.lonelyAttendees.length > 0 && (
                    <span className="text-[10px] bg-danger/20 text-danger px-2 py-0.5 rounded-full">
                      {stats.lonelyAttendees.length}
                    </span>
                  )}
                </div>
                {stats.lonelyAttendees.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-2xl mb-2">✨</div>
                    <p className="text-sm text-white/40">Everyone is connected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.lonelyAttendees.map((a) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center text-sm font-bold text-danger">
                          {a.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-white/40">{a.role} · {a.company}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top connectors + Serendip Score leaderboard */}
            {stats.topConnectors.length > 0 && (
              <div className="glass-card p-6 mb-6">
                <div className="section-label mb-4">Top connectors · Serendip Score</div>
                <div className="flex flex-wrap gap-3">
                  {stats.topConnectors.map(({ attendee, count, score }) => (
                    <div key={attendee.id} className="flex items-center gap-2.5 bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06]">
                      <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
                        {attendee.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{attendee.name}</div>
                        <div className="text-xs text-white/40">{count} match{count !== 1 ? 'es' : ''}</div>
                      </div>
                      {score > 0 && (
                        <div className="ml-1 text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/15">
                          ⚡ {score}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All attendees */}
            <div className="glass-card p-6">
              <div className="section-label mb-5 flex items-center gap-2">
                All attendees
                <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full normal-case font-normal">
                  {gridData.length}
                </span>
              </div>

              {gridData.length === 0 ? (
                <div className="text-center py-10 text-white/25 text-sm">
                  No attendees yet — share the join code to get started
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {gridData.map((a) => (
                    <AttendeeCard key={a.id} attendee={a} matchCount={a.matches} connected={a.status === 'Connected'} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
