const pad = (n: number) => String(n).padStart(2, '0');

/** HH:MM:SS (UTC) depuis un timestamp ms ou une chaîne ISO. */
export function formatClock(t: number | string): string {
  const d = new Date(t);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** « 2:05 » pour une durée en ms. */
export function formatWait(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** « 12 min » entre deux instants ms. */
export function formatElapsed(from: number, to: number): string {
  return `${Math.max(0, Math.round((to - from) / 60_000))} min`;
}
