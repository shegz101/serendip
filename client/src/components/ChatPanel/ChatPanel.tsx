import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api';
import type { Message, Match } from '../../lib/types';

interface Props {
  match: Match;
  userId: string;
  userTag: string;
  partnerName: string;
  partnerTag: string;
}

const SHORTCUTS = [
  { label: 'On my way 🏃', text: "On my way! See you in a moment." },
  { label: 'Coffee bar ☕', text: "I'm at the coffee bar." },
  { label: 'Main stage 🎤', text: "Near the main stage area." },
  { label: 'Terrace 🌿', text: "I'm on the outdoor terrace." },
  { label: 'Entrance 🚪', text: "I'm by the main entrance." },
];

export default function ChatPanel({ match, userId, userTag, partnerName, partnerTag }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const seenCountRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await api.getMessages(match.id);
      setMessages(msgs);
      if (!open) {
        const theirCount = msgs.filter((m) => m.senderId !== userId).length;
        setUnread(Math.max(0, theirCount - seenCountRef.current));
      }
    } catch {/* silent */}
  }, [match.id, userId, open]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, open ? 3000 : 10000);
    return () => clearInterval(interval);
  }, [fetchMessages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setTimeout(() => inputRef.current?.focus(), 120);
      const theirCount = messages.filter((m) => m.senderId !== userId).length;
      seenCountRef.current = theirCount;
      setUnread(0);
    }
  }, [open]); // intentionally only on open toggle

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const doSend = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(match.id, userId, text.trim());
      setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    doSend(input);
    setInput('');
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="flex flex-col rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden animate-fade-up"
          style={{ width: 312, height: 440, background: '#100d1f' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.07] bg-white/[0.03] flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {partnerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{partnerName}</div>
              <div className="text-[9px] text-white/35 font-mono">{partnerTag}</div>
            </div>
            <span className="flex items-center gap-1 text-[9px] text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              live
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/25 hover:text-white/60 transition-colors text-xl leading-none ml-0.5 flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Quick location shortcuts */}
          <div
            className="flex gap-1.5 px-3 py-2 border-b border-white/[0.05] flex-shrink-0 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {SHORTCUTS.map((s) => (
              <button
                key={s.label}
                onClick={() => doSend(s.text)}
                disabled={sending}
                className="text-[9px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-white/40 hover:bg-brand-500/15 hover:border-brand-500/25 hover:text-brand-300 transition-all flex-shrink-0 disabled:opacity-40"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-4">
                <div className="text-3xl">💬</div>
                <p className="text-[11px] text-white/30 leading-relaxed max-w-[170px]">
                  You're matched with {partnerName.split(' ')[0]}. Say hi or use a shortcut above to coordinate.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const mine = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[210px] px-3 py-2 text-xs leading-relaxed break-words ${
                        mine
                          ? 'bg-brand-500 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/[0.08] text-white/85 rounded-2xl rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-white/20 px-1">
                      {mine ? userTag : partnerTag} · {fmt(msg.sentAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="px-3 py-2.5 border-t border-white/[0.07] bg-white/[0.02] flex-shrink-0 flex gap-2 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message…"
              maxLength={280}
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-400/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-7 h-7 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-12 h-12 rounded-2xl bg-gradient-brand shadow-glow flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-150"
        aria-label="Open chat"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] bg-danger rounded-full text-[9px] font-bold flex items-center justify-center px-1 shadow-lg">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
