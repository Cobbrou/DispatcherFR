import type { Coordinates, Route } from '../types';
import { distanceM } from './geo';

/** Gyrophare + 2-tons : les unités engagées roulent plus vite que le trafic modélisé par OSRM. */
const EMERGENCY_FACTOR = 1.25;
const FALLBACK_KMH = 50;

/** `segSeconds[i]` = durée de roulage entre `points[i]` et `points[i + 1]`. */
export function buildRoute(points: Coordinates[], segSeconds: number[], factor = EMERGENCY_FACTOR): Route {
  const cumMs = [0];
  segSeconds.forEach((s, i) => cumMs.push(cumMs[i] + (s * 1000) / factor));
  return { points, cumMs };
}

/** Ligne droite à vitesse constante : repli quand le calcul d'itinéraire échoue. */
export function straightRoute(a: Coordinates, b: Coordinates, kmh = FALLBACK_KMH): Route {
  return buildRoute([a, b], [distanceM(a, b) / (kmh / 3.6)], 1);
}

export const routeDurationMs = (r: Route) => r.cumMs[r.cumMs.length - 1];

/** Premier sommet pas encore atteint après `elapsedMs`. */
function nextIndex(r: Route, elapsedMs: number): number {
  const i = r.cumMs.findIndex((t) => t > elapsedMs);
  return i === -1 ? r.points.length - 1 : i;
}

export function positionAt(r: Route, elapsedMs: number): Coordinates {
  const i = nextIndex(r, elapsedMs);
  if (i === 0) return r.points[0];
  const [a, b] = [r.points[i - 1], r.points[i]];
  const span = r.cumMs[i] - r.cumMs[i - 1];
  const f = span > 0 ? Math.min(1, (elapsedMs - r.cumMs[i - 1]) / span) : 1;
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
}

/** Tracé restant à parcourir, de la position courante jusqu'à l'arrivée. */
export function remainingPath(r: Route, elapsedMs: number): Coordinates[] {
  return [positionAt(r, elapsedMs), ...r.points.slice(nextIndex(r, elapsedMs))];
}

const OSRM_URL: string = import.meta.env.VITE_OSRM_URL ?? 'https://router.project-osrm.org';
const TIMEOUT_MS = 4000;

const key = (p: Coordinates) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
const cache = new Map<string, Route>();

/**
 * Itinéraire routier via OSRM (serveur de démonstration public, sans clé ; `VITE_OSRM_URL` pour le remplacer) :
 * tracé sur les vraies routes, durée de chaque tronçon selon le type de voie. Repli en ligne droite
 * (`estimated`) si le service est injoignable ou répond de travers. Les trajets réussis sont mémorisés.
 * ponytail: serveur de démo (~1 requête/s, sans SLA) et pas de file d'attente ; auto-héberger OSRM pour un usage soutenu.
 */
export async function fetchRoute(from: Coordinates, to: Coordinates): Promise<Route> {
  const k = `${key(from)}>${key(to)}`;
  const known = cache.get(k);
  if (known) return known;
  try {
    const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&annotations=duration`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const r = (await res.json()).routes?.[0];
    const points: Coordinates[] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    if (points.length < 2) throw new Error('itinéraire vide');
    const ann: number[] | undefined = r.legs?.[0]?.annotation?.duration;
    let route: Route;
    if (ann?.length === points.length - 1) route = buildRoute(points, ann);
    else {
      // Annotations absentes ou décalées : durée totale répartie au prorata des distances.
      const lens = points.slice(1).map((p, i) => distanceM(points[i], p));
      const total = lens.reduce((a, b) => a + b, 0) || 1;
      route = buildRoute(points, lens.map((l) => (l / total) * r.duration));
    }
    if (!(routeDurationMs(route) > 0) || !Number.isFinite(routeDurationMs(route))) throw new Error('durée invalide');
    cache.set(k, route);
    return route;
  } catch {
    return { ...straightRoute(from, to), estimated: true };
  }
}
