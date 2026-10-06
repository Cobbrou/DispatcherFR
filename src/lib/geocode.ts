import { communes } from '../data/communes';
import { streets } from '../data/gazetteer';
import type { Coordinates, ServiceType } from '../types';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** « rue du Château » → « chateau » */
const core = (name: string) =>
  norm(name).replace(/^(rue|avenue|boulevard|place|route|chemin|impasse|allee|quai)\s+((de la|de l|du|des|de|d|la|le|l)\s+)?/, '');

// Formes normalisées calculées une fois (le gazetteer compte plus d'un millier de voies).
const indexed = streets.map((s) => ({ s, label: norm(`${s.name} ${s.commune}`), core: ` ${core(s.name)} ` }));
const communeKeys = communes
  .map((c) => ({ c, key: ` ${norm(c.name)} ` }))
  .sort((a, b) => b.key.length - a.key.length); // « Saint-Ouen-l'Aumône » avant « Saint-Ouen »

/**
 * Propositions d'adresse pour ce que l'opérateur a déjà tapé : « 12 pasteur lou » → « 12 rue Pasteur, Louvres ».
 * ponytail: ne connaît que des voies courantes par commune ; brancher api-adresse.data.gouv.fr (autocomplétion) pour les vraies rues.
 */
export function suggestAddresses(input: string, max = 8): string[] {
  const m = input.trim().match(/^(\d+\s*(?:bis|ter)?\s+)?(.*)$/i);
  const prefix = m?.[1] ?? '';
  const words = norm(m?.[2] ?? '').split(' ').filter(Boolean);
  if (!words.length) return [];
  return indexed
    .filter((x) => words.every((w) => x.label.includes(w)))
    .slice(0, max)
    .map((x) => `${prefix}${x.s.name}, ${x.s.commune}`);
}

/** Géocodage minimal : commune trouvée dans le texte, voie du gazetteer si elle y figure, décalage selon le numéro. */
export function geocode(address: string): { coordinates: Coordinates; zone: ServiceType } | null {
  const text = ` ${norm(address)} `;
  const commune = communeKeys.find((x) => text.includes(x.key))?.c;
  if (!commune) return null;
  const street = indexed.find((x) => x.s.commune === commune.name && text.includes(x.core))?.s;
  const base = street ?? commune;
  // Numéro de rue en tête seulement (un code postal ne doit pas décaler la fiche).
  const n = Number(text.match(/^ (\d{1,3}) /)?.[1] ?? 0);
  return {
    coordinates: { lat: base.lat + n * 0.00002, lng: base.lng + n * 0.00002 },
    zone: 'GENDARMERIE',
  };
}
