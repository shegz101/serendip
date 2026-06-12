export type Role = 'Founder' | 'Engineer' | 'Designer' | 'Recruiter' | 'VC' | 'Speaker' | 'Other';

export type Intent =
  | 'Hiring' | 'Job hunting' | 'Find a co-founder' | 'Raise money'
  | 'Get feedback' | 'Learn' | 'Meet potential customers' | 'Share knowledge';

export interface SerendipEvent {
  id: string;
  name: string;
  organiser: string;
  company?: string;
  location: string;
  description?: string;
  theme?: string;
  duration_hours: number;
  starts_at: string;
  ends_at: string;
  join_code: string;
  created_at: string;
  attendeeCount?: number;
  matchCount?: number;
}

export interface Attendee {
  id: string;
  event_id: string;
  name: string;
  role: Role;
  company: string;
  bio: string;
  intent: Intent[];
  give_text: string;
  need_text: string;
  available_times: string[];
  tag: string;
  score: number;
  joined_at: string;
}

export interface Session {
  userId: string;
  eventId: string;
  tag: string;
  name: string;
  eventName: string;
}

export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export type MatchAvailability = 'found' | 'no_candidates' | 'exhausted' | 'no_match';

export interface MatchResponse {
  match: Match | null;
  status: MatchAvailability;
}

export interface Match {
  id: string;
  eventId: string;
  attendeeA: Attendee;
  attendeeB: Attendee;
  reasoning: string;
  slot: { time: string; location: string };
  status: MatchStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export interface DashboardStats {
  event: SerendipEvent;
  totalAttendees: number;
  totalMatches: number;
  acceptedMatches: number;
  acceptanceRate: number;
  lonelyAttendees: Attendee[];
  topConnectors: { attendee: Attendee; count: number; score: number }[];
  matchesByHour: { hour: string; count: number }[];
  attendees: Attendee[];
}
