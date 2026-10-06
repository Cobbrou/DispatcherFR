import {
  fleeMeans, firstNames, landmarks, lastNames, openingPrefixes,
  suspectAges, suspectClothes, suspectSubjects, templates,
} from '../data/generatorData';
import { streets } from '../data/gazetteer';
import { chance, int, pick, weighted, type Rng } from '../lib/rng';
import type { CallerPersonality, IncomingCall, ServiceType } from '../types';

const PERSONALITIES: { value: CallerPersonality; weight: number; stress: [number, number] }[] = [
  { value: 'CALME', weight: 45, stress: [10, 30] },
  { value: 'PANIQUE', weight: 35, stress: [70, 92] },
  { value: 'EVASIF', weight: 20, stress: [30, 55] },
];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function describeSuspects(rng: Rng, n: number): string {
  const one = () => `${pick(rng, suspectSubjects)} ${pick(rng, suspectAges)}, ${pick(rng, suspectClothes)}`;
  return n === 1 ? one() : `${n} individus, dont ${one()}`;
}

function describeFlight(rng: Rng, n: number): string {
  if (chance(rng, 0.2)) return n > 1 ? 'Ils sont encore sur place.' : 'Il est encore sur place.';
  return `${n > 1 ? 'Ils sont partis' : 'Il est parti'} ${pick(rng, fleeMeans)}.`;
}

/** Tire un appel entièrement aléatoire pour le poste `service`. */
export function generateCall(rng: Rng, service: ServiceType): IncomingCall {
  const tpl = weighted(rng, templates);
  const person = weighted(rng, PERSONALITIES);
  const street = pick(rng, streets);
  const number = int(rng, [1, 60]);
  const address = `${number} ${street.name}, ${street.commune}`;
  const landmark = pick(rng, landmarks);

  const suspects = int(rng, tpl.suspects);
  const victims = int(rng, tpl.victims);
  const injuries = victims > 0 && chance(rng, tpl.injuryChance);
  const weapons = suspects > 0 && chance(rng, tpl.weaponChance) ? pick(rng, tpl.weapons) : '';

  const prefix = pick(rng, openingPrefixes[person.value]);
  const story = pick(rng, tpl.openings);
  const volunteersAddress = chance(rng, 0.3);
  const opening =
    prefix + (/(,|mais) $/.test(prefix) ? lowerFirst(story) : story) + (volunteersAddress ? ` C'est au ${address}.` : '');

  const phone = `0${pick(rng, [6, 7])} ${[1, 2, 3, 4].map(() => String(int(rng, [0, 99])).padStart(2, '0')).join(' ')}`;

  return {
    id: `call-${Math.floor(rng() * 1e9).toString(36)}`,
    callerPhoneNumber: chance(rng, 0.15) ? 'Numéro masqué' : phone,
    callerStressLevel: int(rng, person.stress),
    truth: {
      callerFirstName: pick(rng, firstNames),
      callerLastName: pick(rng, lastNames),
      callerPhone: phone,
      personality: person.value,
      category: tpl.category,
      address,
      landmark,
      coordinates: { lat: street.lat + number * 0.00002, lng: street.lng + number * 0.00002 },
      zone: service,
      opening,
      details: pick(rng, tpl.details),
      victims,
      suspects,
      injuries,
      weapons,
      suspectDescription: suspects > 0 ? describeSuspects(rng, suspects) : '',
      suspectDirection: suspects > 0 ? describeFlight(rng, suspects) : '',
      requiredUnits: int(rng, tpl.units),
    },
  };
}
