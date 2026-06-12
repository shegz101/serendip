import type { Match, MatchResponse, DashboardStats, Attendee, SerendipEvent, Message } from './types';

// Ensure the base URL is always absolute — guards against missing https:// prefix
const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const API_BASE = rawBase && !rawBase.startsWith('http') ? `https://${rawBase}` : rawBase;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  // Events
  listEvents: () => request<SerendipEvent[]>('/events'),
  getEvent: (id: string) => request<SerendipEvent>(`/events/${id}`),
  getEventByCode: (code: string) => request<SerendipEvent>(`/events/code/${code}`),
  createEvent: (data: Partial<SerendipEvent>) =>
    request<SerendipEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),

  // Profiles
  register: (profile: Partial<Attendee> & { event_id: string }) =>
    request<Attendee>('/profiles', { method: 'POST', body: JSON.stringify(profile) }),
  listAttendees: (eventId: string) =>
    request<Attendee[]>(`/profiles/event/${eventId}`),
  getAttendee: (id: string) => request<Attendee>(`/profiles/${id}`),

  // Matches
  getMatch: (userId: string, eventId: string) =>
    request<MatchResponse>(`/matches/next?userId=${userId}&eventId=${eventId}`),
  requestMatch: (userId: string, targetId: string, eventId: string) =>
    request<Match>('/matches/request', { method: 'POST', body: JSON.stringify({ userId, targetId, eventId }) }),
  respondToMatch: (matchId: string, userId: string, accept: boolean) =>
    request<Match>(`/matches/${matchId}/respond`, {
      method: 'POST', body: JSON.stringify({ userId, accept }),
    }),
  getMatchHistory: (userId: string, eventId: string) =>
    request<Match[]>(`/matches/history?userId=${userId}&eventId=${eventId}`),

  // Dashboard
  getDashboard: (eventId: string) => request<DashboardStats>(`/dashboard/${eventId}`),

  // Chat
  getMessages: (matchId: string) => request<Message[]>(`/chat/${matchId}`),
  sendMessage: (matchId: string, senderId: string, text: string) =>
    request<Message>(`/chat/${matchId}`, { method: 'POST', body: JSON.stringify({ senderId, text }) }),

  // Tag & session recovery
  checkTag: (tag: string, eventId: string) =>
    request<{ available: boolean }>(`/profiles/check-tag?tag=${encodeURIComponent(tag)}&eventId=${encodeURIComponent(eventId)}`),
  recoverSession: (tag: string, eventCode: string) =>
    request<{ attendee: Attendee; event: SerendipEvent }>(`/profiles/recover?tag=${encodeURIComponent(tag)}&eventCode=${encodeURIComponent(eventCode)}`),
};
