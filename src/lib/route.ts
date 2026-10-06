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

/**
 * Itinéraire routier via OSRM (serveur de démonstration public, sans clé) : tracé sur les vraies routes,
 * durée de chaque tronçon selon le type de voie. Repli en ligne droite si le service est injoignable.
 * ponytail: serveur de démo, pas de SLA ; auto-héberger OSRM pour un usage soutenu.
 */
export async function fetchRoute(from: Coordinates, to: Coordinates): Promise<Route> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&annotations=duration`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const r = (await res.json()).routes?.[0];
    const points: Coordinates[] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    if (points.length < 2) throw new Error('itinéraire vide');
    const ann: number[] | undefined = r.legs?.[0]?.annotation?.duration;
    if (ann?.length === points.length - 1) return buildRoute(points, ann);
    // Annotations absentes ou décalées : durée totale répartie au prorata des distances.
    const lens = points.slice(1).map((p, i) => distanceM(points[i], p));
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    return buildRoute(points, lens.map((l) => (l / total) * r.duration));
  } catch {
    return straightRoute(from, to);
  }
}
