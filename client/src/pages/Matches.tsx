import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@progress/kendo-react-indicators';
import { getSession, clearSession } from '../lib/session';
import { api } from '../lib/api';
import MatchCard from '../components/MatchCard/MatchCard';
import type { Match } from '../lib/types';

type State = 'loading' | 'match' | 'accepted' | 'no_candidates' | 'exhausted' | 'no_match';

export default function Matches() {
  const navigate = useNavigate();
  const session = getSession()!;
  const [state, setState] = useState<State>('loading');
  const [match, setMatch] = useState<Match | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptedMatch, setAcceptedMatch] = useState<Match | null>(null);

  const loadMatch = useCallback(async () => {
    setState('loading');
    try {
      const result = await api.getMatch(session.userId, session.eventId);
      if (result.match) {
        setMatch(result.match);
        setState('match');
      } else {
        setState(result.status as State);
      }
    } catch {
      setState('no_match');
    }
  }, [session.userId, session.eventId]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  const handleAccept = async () => {
    if (!match) return;
    setActionLoading(true);
    try {
      await api.respondToMatch(match.id, session.userId, true);
      setAcceptedMatch(match);
      setState('accepted');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!match) return;
    setActionLoading(true);
    try {
      await api.respondToMatch(match.id, session.userId, false);
      await loadMatch();
    } finally {
      setActionLoading(false);
    }
  };

  const them = acceptedMatch
    ? (acceptedMatch.attendeeA.id === session.userId ? acceptedMatch.attendeeB : acceptedMatch.attendeeA)
    : null;

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-brand-500/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold">Serendip</span>
        </button>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          <span className="px-3 py-1.5 text-xs font-semibold bg-brand-500/20 text-brand-300 rounded-lg">
            AI Match
          </span>
          <button
            onClick={() => navigate('/browse')}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Browse all
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40 bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/[0.07] hidden sm:block">
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader size="large" type="pulsing" themeColor="primary" />
            <p className="text-white/40 text-sm">Finding your perfect match at {session.eventName}…</p>
          </div>
        )}

        {state === 'match' && match && (
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="section-label mb-1">AI-powered · {session.eventName}</div>
              <h1 className="text-2xl font-bold">Here's who you should meet</h1>
            </div>
            <MatchCard
              match={match}
              currentUserId={session.userId}
              onAccept={handleAccept}
              onDecline={handleDecline}
              loading={actionLoading}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/browse')}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Prefer to browse manually? →
              </button>
            </div>
          </div>
        )}

        {state === 'accepted' && acceptedMatch && them && (
          <div className="w-full max-w-sm text-center animate-fade-up">
            <div className="text-5xl mb-4">🤝</div>
            <h1 className="text-2xl font-bold mb-2">Meeting confirmed!</h1>
            <p className="text-white/50 mb-6">
              Both of you are locked in. Go find them.
            </p>

            <div className="glass-card p-5 mb-6 text-left">
              <div className="section-label text-[10px] mb-4">Find them at the event</div>

              {/* @tag — primary identifier */}
              <div className="flex flex-col items-center bg-brand-500/10 border border-brand-500/20 rounded-xl py-4 px-3 mb-4">
                <div className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider mb-2">Their Serendip tag</div>
                <div className="font-mono text-2xl font-bold text-brand-200 tracking-wide">{them.tag}</div>
                <div className="text-[10px] text-white/30 mt-1">Walk up and say "Are you {them.tag}?"</div>
              </div>

              {/* Person info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center font-bold text-white flex-shrink-0">
                  {them.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{them.name}</div>
                  <div className="text-sm text-white/50">{them.role} · {them.company}</div>
                </div>
              </div>

              {/* Time window */}
              <div className="text-xs text-white/40 bg-white/[0.03] rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2">
                <span>🕐</span>
                <span>Suggested time window: <span className="text-white/65 font-medium">{acceptedMatch.slot.time}</span></span>
              </div>

              {them.give_text && (
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className="text-[10px] text-spark font-semibold mb-1.5 uppercase tracking-wider">Conversation starter</div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    Ask {them.name.split(' ')[0]} about {them.give_text.toLowerCase().slice(0, 80)}{them.give_text.length > 80 ? '…' : ''}
                  </p>
                </div>
              )}
            </div>

            <button onClick={loadMatch} className="btn-primary w-full py-3 mb-3">
              See next match →
            </button>
            <button onClick={() => navigate('/browse')} className="btn-ghost w-full py-2.5 text-sm">
              Browse other attendees
            </button>
          </div>
        )}

        {/* Nobody else has joined yet */}
        {state === 'no_candidates' && (
          <div className="text-center animate-fade-up max-w-sm">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-bold mb-2">You're the first one here</h1>
            <p className="text-white/50 mb-6">
              No one else has joined <span className="text-white/70">{session.eventName}</span> yet.
              Share the join code with other attendees and a match will appear automatically once someone joins.
            </p>
            <div className="glass-card p-4 mb-6 flex items-center gap-3">
              <div className="text-2xl">🔔</div>
              <div className="text-left">
                <div className="text-sm font-medium">This page will update automatically</div>
                <div className="text-xs text-white/40 mt-0.5">
                  Come back after others have onboarded — or refresh to check.
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/')} className="btn-ghost py-2.5 text-sm w-full">
              Back to home
            </button>
          </div>
        )}

        {/* Matched with everyone in the event */}
        {state === 'exhausted' && (
          <div className="text-center animate-fade-up max-w-sm">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-2xl font-bold mb-2">You've met everyone</h1>
            <p className="text-white/50 mb-6">
              Serendip has introduced you to every attendee currently at{' '}
              <span className="text-white/70">{session.eventName}</span>.
              New matches will appear as more people join the event.
            </p>
            <div className="glass-card p-4 mb-6 text-left space-y-3">
              <div className="section-label text-[10px]">What you can do now</div>
              <div className="flex items-start gap-3 text-sm">
                <span>🤝</span>
                <span className="text-white/60">Go find the people you matched with and have those conversations</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span>👀</span>
                <span className="text-white/60">Browse the attendee list to revisit profiles manually</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span>⏳</span>
                <span className="text-white/60">Check back later — new attendees may still join</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/browse')} className="btn-primary py-3">
                Browse all attendees →
              </button>
              <button onClick={loadMatch} className="btn-ghost py-2.5 text-sm">
                Check for new joins
              </button>
            </div>
          </div>
        )}

        {/* Candidates exist but matching pipeline returned nothing (rare) */}
        {state === 'no_match' && (
          <div className="text-center animate-fade-up max-w-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Looking for the right match</h1>
            <p className="text-white/50 mb-6">
              There are attendees at {session.eventName} but we couldn't find a strong match
              for you right now. Try browsing manually — you might spot someone interesting yourself.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/browse')} className="btn-primary py-3">
                Browse attendees manually →
              </button>
              <button onClick={loadMatch} className="btn-ghost py-2.5 text-sm">
                Try again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
