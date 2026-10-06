import { streets } from '../data/gazetteer';
import type { Coordinates, ServiceType } from '../types';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** « rue du Château » → « chateau » */
const core = (name: string) =>
  norm(name).replace(/^(rue|avenue|boulevard|place|route|chemin|impasse|allee|quai)\s+((de la|de l|du|des|de|d|la|le|l)\s+)?/, '');

/**
 * Propositions d'adresse pour ce que l'opérateur a déjà tapé : « 12 car » → « 12 rue Carnot, Melun ».
 * ponytail: ne connaît que les rues du gazetteer ; brancher api-adresse.data.gouv.fr (sans clé) pour toute la France.
 */
export function suggestAddresses(input: string, max = 8): string[] {
  const m = input.trim().match(/^(\d+\s*(?:bis|ter)?\s+)?(.*)$/i);
  const prefix = m?.[1] ?? '';
  const query = norm(m?.[2] ?? '');
  if (!query) return [];
  return streets
    .filter((s) => norm(`${s.name} ${s.commune}`).includes(query))
    .slice(0, max)
    .map((s) => `${prefix}${s.name}, ${s.commune}`);
}

/** Géocodage minimal : retrouve la rue dans le gazetteer, décale légèrement selon le numéro. */
export function geocode(address: string): { coordinates: Coordinates; zone: ServiceType } | null {
  const text = ` ${norm(address)} `;
  const street = streets.find((s) => text.includes(` ${core(s.name)} `));
  if (!street) return null;
  const n = Number(text.match(/\d+/)?.[0] ?? 0);
  return {
    coordinates: { lat: street.lat + n * 0.00002, lng: street.lng + n * 0.00002 },
    zone: street.zone,
  };
}
