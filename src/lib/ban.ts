import type { Coordinates } from '../types';

/**
 * Géocode une adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr, sans clé) :
 * rue et numéro exacts. `null` si adresse introuvable, trop peu fiable ou hors du Val-d'Oise ;
 * lève une erreur si le service est injoignable (l'appelant distingue les deux cas).
 */
const BAN = 'https://api-adresse.data.gouv.fr/search/';

/**
 * Propositions d'adresse de la BAN pour une saisie en cours, limitées au Val-d'Oise : « 12 Rue Pasteur, Louvres ».
 * Lève si le service est injoignable (l'appelant garde alors les propositions locales).
 */
export async function suggestBan(input: string, signal?: AbortSignal): Promise<string[]> {
  const url = `${BAN}?q=${encodeURIComponent(input)}&limit=5&autocomplete=1&lat=49.07&lon=2.17`;
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`BAN ${res.status}`);
  const features: { properties: { name: string; city: string; citycode?: string } }[] = (await res.json()).features ?? [];
  return features.filter((f) => f.properties.citycode?.startsWith('95')).map((f) => `${f.properties.name}, ${f.properties.city}`);
}

export async function geocodeBan(address: string): Promise<Coordinates | null> {
  // lat/lon : biais vers le centre du 95 ; le filtre sur le code INSEE écarte les homonymes d'autres départements.
  const url = `${BAN}?q=${encodeURIComponent(address)}&limit=3&lat=49.07&lon=2.17`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`BAN ${res.status}`);
  const features: { properties: { score: number; citycode?: string }; geometry: { coordinates: [number, number] } }[] =
    (await res.json()).features ?? [];
  const f = features.find((x) => x.properties.score >= 0.5 && x.properties.citycode?.startsWith('95'));
  if (!f) return null;
  const [lng, lat] = f.geometry.coordinates;
  return { lat, lng };
}
