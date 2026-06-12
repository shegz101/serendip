import { Button } from '@progress/kendo-react-buttons';
import type { Match } from '../../lib/types';

interface Props {
  match: Match;
  currentUserId: string;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export default function MatchCard({ match, currentUserId, onAccept, onDecline, loading }: Props) {
  const them = match.attendeeA.id === currentUserId ? match.attendeeB : match.attendeeA;
  const initial = them.name.charAt(0).toUpperCase();

  const COLORS = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
  const color = COLORS[them.id.charCodeAt(0) % COLORS.length];

  return (
    <div className="glass-card shadow-card p-6 w-full max-w-sm mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="section-label text-[10px]">{match.slot.time} match</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-white/40">Live</span>
        </div>
      </div>

      {/* Person */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl font-bold text-white shadow-lg flex-shrink-0`}>
          {initial}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-white text-lg leading-tight">{them.name}</div>
          <div className="text-sm text-white/50 truncate">{them.role} · {them.company}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {them.intent.slice(0, 2).map((i) => (
              <span key={i} className="tag text-[10px] px-2 py-0.5">{i}</span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="relative bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 mb-5">
        <div className="absolute -top-2.5 left-4 bg-ink-soft px-2 py-0.5 rounded-full">
          <span className="text-[10px] text-brand-400 font-semibold">Why you should meet</span>
        </div>
        <p className="text-sm text-white/75 leading-relaxed mt-1">
          "{match.reasoning}"
        </p>
      </div>

      {/* Slot */}
      <div className="flex items-center gap-2 text-xs text-white/40 mb-6 bg-white/[0.03] px-4 py-2.5 rounded-xl">
        <span className="text-base">🕐</span>
        <span>Suggested meeting time: <span className="text-white/60 font-medium">{match.slot.time}</span></span>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <Button
          themeColor="primary"
          onClick={onAccept}
          disabled={loading}
          style={{ flex: 1, borderRadius: '12px', padding: '11px', fontWeight: 600, fontSize: '14px' }}
        >
          ✅ I'm in
        </Button>
        <Button
          fillMode="outline"
          onClick={onDecline}
          disabled={loading}
          style={{ flex: 1, borderRadius: '12px', padding: '11px', fontWeight: 600, fontSize: '14px', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        >
          🔄 Next time
        </Button>
      </div>
    </div>
  );
}
