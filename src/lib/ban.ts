import type { Coordinates } from '../types';

/**
 * Géocode une adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr, sans clé) :
 * rue et numéro exacts. `null` si adresse introuvable, trop peu fiable ou hors du Val-d'Oise ;
 * lève une erreur si le service est injoignable (l'appelant distingue les deux cas).
 */
export async function geocodeBan(address: string): Promise<Coordinates | null> {
  // lat/lon : biais vers le centre du 95 ; le filtre sur le code INSEE écarte les homonymes d'autres départements.
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=3&lat=49.07&lon=2.17`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`BAN ${res.status}`);
  const features: { properties: { score: number; citycode?: string }; geometry: { coordinates: [number, number] } }[] =
    (await res.json()).features ?? [];
  const f = features.find((x) => x.properties.score >= 0.5 && x.properties.citycode?.startsWith('95'));
  if (!f) return null;
  const [lng, lat] = f.geometry.coordinates;
  return { lat, lng };
}
