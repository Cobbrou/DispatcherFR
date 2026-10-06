import type { ServiceType } from '../types';
import { communes } from './communes';

export interface Street {
  name: string;
  commune: string;
  zone: ServiceType;
  lat: number;
  lng: number;
}

/** Noms de voies présents dans presque toutes les communes ; la BAN donne ensuite la position exacte. */
const COMMON_STREETS = [
  'rue de la Mairie',
  "rue de l'Église",
  'Grande Rue',
  'rue du Général de Gaulle',
  'avenue de la République',
  'rue Jean Jaurès',
  'rue Pasteur',
  'rue de la Gare',
];

/** Décalage stable (~±500 m) autour du centre de la commune, propre à chaque voie. */
function offset(key: string): [number, number] {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const unit = (n: number) => (((h >>> n) & 0xff) / 255 - 0.5) * 0.009;
  return [unit(0), unit(8)];
}

// Coordonnées approximatives : tout le Val-d'Oise est en zone gendarmerie (CORG). Base de départ, pas un référentiel d'adresses.
export const streets: Street[] = communes.flatMap((c) =>
  COMMON_STREETS.map((name) => {
    const [dLat, dLng] = offset(`${name}|${c.name}`);
    return { name, commune: c.name, zone: 'GENDARMERIE' as const, lat: c.lat + dLat, lng: c.lng + dLng };
  }),
);
