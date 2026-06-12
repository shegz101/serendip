import type { Session } from './types';

const KEY = 'serendip_session_v2';

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function generateTag(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '').slice(0, 10);
  const suffix = Math.random().toString(36).slice(2, 5);
  return `@${slug}${suffix}`;
}
