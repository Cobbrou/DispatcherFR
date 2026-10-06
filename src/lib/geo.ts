import type { Coordinates } from '../types';

const R = 6_371_000; // rayon terrestre, mètres
const rad = Math.PI / 180;

/** Distance à vol d'oiseau (Haversine), en mètres. */
export function distanceM(a: Coordinates, b: Coordinates): number {
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Avance de `meters` en ligne droite vers `to` ; s'arrête sur `to` si on le dépasse. */
export function moveToward(from: Coordinates, to: Coordinates, meters: number): Coordinates {
  const d = distanceM(from, to);
  if (d <= meters) return to;
  const f = meters / d;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}
