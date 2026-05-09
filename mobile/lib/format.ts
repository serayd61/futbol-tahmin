import { format } from 'date-fns';

export function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return format(d, 'd MMM HH:mm');
}

export function formatScore(home: number | null, away: number | null): string {
  if (home == null || away == null) return '— : —';
  return `${home} : ${away}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
