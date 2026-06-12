import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@progress/kendo-react-indicators';
import { Button } from '@progress/kendo-react-buttons';
import { getSession, clearSession } from '../lib/session';
import { api } from '../lib/api';
import type { Attendee } from '../lib/types';

const COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];
const getColor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

export default function Browse() {
  const navigate = useNavigate();
  const session = getSession()!;
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [requestLoading, setRequestLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    api.listAttendees(session.eventId)
      .then((list) => setAttendees(list.filter((a) => a.id !== session.userId)))
      .finally(() => setLoading(false));
  }, [session.eventId, session.userId]);

  const handleRequest = async (targetId: string) => {
    setRequestLoading(targetId);
    setRequestError(null);
    try {
      await api.requestMatch(session.userId, targetId, session.eventId);
      setRequested((s) => new Set([...s, targetId]));
    } catch (e: unknown) {
      setRequestError((e as Error).message || 'Request failed. Try again.');
    } finally {
      setRequestLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[500px] rounded-full bg-brand-500/8 blur-[120px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold">Serendip</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.07] hidden sm:block">
            {session.eventName}
          </span>
          <button
            onClick={() => navigate('/matches')}
            className="btn-primary text-xs px-3 py-1.5"
          >
            AI Match →
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40 bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/[0.07]">
            {session.tag}
          </div>
          <button
            onClick={() => { clearSession(); navigate('/'); }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Leave
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="section-label mb-2">Manual browse</div>
            <h1 className="text-2xl font-bold">Who's at {session.eventName}?</h1>
            <p className="text-white/40 text-sm mt-1">
              {loading ? 'Loading attendees…' : `${attendees.length} attendee${attendees.length !== 1 ? 's' : ''} to connect with`}
            </p>
          </div>
          <div className="text-xs text-white/30 text-right hidden sm:block">
            Click any card to see<br />what they offer + need
          </div>
        </div>

        {requestError && (
          <div className="mb-6 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {requestError}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <Loader size="large" type="pulsing" themeColor="primary" />
          </div>
        )}

        {!loading && attendees.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">👀</div>
            <h2 className="text-lg font-semibold mb-2">No other attendees yet</h2>
            <p className="text-white/40 text-sm">Be the first! Share the event code to invite others.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendees.map((attendee) => {
            const isExpanded = expandedId === attendee.id;
            const hasRequested = requested.has(attendee.id);
            const isLoading = requestLoading === attendee.id;

            return (
              <div
                key={attendee.id}
                className={`glass-card p-5 flex flex-col gap-4 transition-all duration-200 cursor-pointer ${
                  isExpanded ? 'border-brand-500/25' : 'hover:border-white/15'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : attendee.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getColor(attendee.id)} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}
                  >
                    {attendee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{attendee.name}</div>
                    <div className="text-xs text-white/45 truncate">{attendee.role} · {attendee.company}</div>
                  </div>
                  {attendee.score > 0 && (
                    <div className="ml-auto flex-shrink-0 text-[10px] text-brand-400 bg-brand-500/10 px-2 py-1 rounded-full border border-brand-500/15 whitespace-nowrap">
                      ⚡ {attendee.score}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {attendee.intent.slice(0, 3).map((i) => (
                    <span key={i} className="tag text-[10px] px-2 py-0.5">{i}</span>
                  ))}
                  {attendee.intent.length > 3 && (
                    <span className="text-[10px] text-white/30">+{attendee.intent.length - 3}</span>
                  )}
                </div>

                {isExpanded ? (
                  <div className="space-y-2.5 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-brand-500/5 rounded-lg p-3 border border-brand-500/10">
                      <div className="text-[10px] font-semibold text-brand-400 mb-1.5 uppercase tracking-wider">Can give</div>
                      <p className="text-white/65 leading-relaxed">{attendee.give_text}</p>
                    </div>
                    <div className="bg-spark/5 rounded-lg p-3 border border-spark/10">
                      <div className="text-[10px] font-semibold text-spark mb-1.5 uppercase tracking-wider">Needs</div>
                      <p className="text-white/65 leading-relaxed">{attendee.need_text}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/30">
                    {attendee.give_text.slice(0, 70)}{attendee.give_text.length > 70 ? '…' : ''}
                  </p>
                )}

                <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                  <Button
                    themeColor={hasRequested ? 'success' : 'primary'}
                    onClick={() => !hasRequested && handleRequest(attendee.id)}
                    disabled={hasRequested || isLoading}
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      padding: '9px',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    {isLoading ? '…' : hasRequested ? '✓ Match requested' : '🤝 Request match'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
