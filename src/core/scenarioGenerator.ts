import {
  carModels, fleeMeans, firstNames, landmarks, lastNames, openingPrefixes, scooterModels,
  suspectAges, suspectClothes, suspectSubjects, templates, vehicleColors, WHEN,
  type FactSpec, type IncidentTemplate,
} from '../data/generatorData';
import { streets } from '../data/gazetteer';
import { chance, int, pick, weighted, type Rng } from '../lib/rng';
import type { CallerPersonality, Fact, FactKey, IncomingCall, Knowledge, ServiceType } from '../types';

const PERSONALITIES: { value: CallerPersonality; weight: number; stress: [number, number] }[] = [
  { value: 'CALME', weight: 45, stress: [10, 30] },
  { value: 'PANIQUE', weight: 35, stress: [70, 92] },
  { value: 'EVASIF', weight: 20, stress: [30, 55] },
];

/** Un appelant calme retient mieux les détails qu'un appelant paniqué ou évasif. */
const MEMORY: Record<CallerPersonality, number> = { CALME: 0.05, PANIQUE: -0.2, EVASIF: -0.1 };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Signalement complet, et la bribe qu'un témoin éloigné aurait retenue. */
function describeSuspects(rng: Rng, n: number): { full: string; partial: string } {
  const subject = pick(rng, suspectSubjects);
  const clothes = pick(rng, suspectClothes);
  const full = `${subject} ${pick(rng, suspectAges)}, ${clothes}`;
  return {
    full: n === 1 ? full : `${n} individus, dont ${full}`,
    partial: `Je n'ai pas vu son visage, juste ${subject}, ${clothes}.`,
  };
}

function describeFlight(rng: Rng, n: number, tpl: IncidentTemplate): string {
  if (tpl.flight) return pick(rng, tpl.flight);
  if (chance(rng, 0.2)) return n > 1 ? 'Ils sont encore sur place.' : 'Il est encore sur place.';
  return `${n > 1 ? 'Ils sont partis' : 'Il est parti'} ${pick(rng, fleeMeans)}.`;
}

/** Ce que l'appelant sait d'un détail (`p` = 1 : toujours). Tout, une bribe s'il en existe une, ou rien. */
function knowledgeOf(rng: Rng, p: number, personality: CallerPersonality, hasPartial: boolean): Knowledge {
  const known = p >= 1 ? 1 : Math.min(0.98, Math.max(0.05, p + MEMORY[personality]));
  if (chance(rng, known)) return 'FULL';
  return hasPartial && chance(rng, 0.55) ? 'PARTIAL' : 'NONE';
}

function fact(rng: Rng, spec: FactSpec, personality: CallerPersonality): Fact {
  const knowledge = knowledgeOf(rng, spec.known, personality, !!spec.partial);
  return {
    value: pick(rng, spec.values),
    knowledge,
    ...(spec.partial && { partial: pick(rng, spec.partial) }),
    ...(spec.unknown && { unknown: pick(rng, spec.unknown) }),
  };
}

const PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTVWXYZ';

/** Véhicule concerné : type, couleur et plaque cohérents entre eux. */
function vehicleFacts(rng: Rng, tpl: IncidentTemplate, personality: CallerPersonality): Partial<Record<FactKey, Fact>> {
  const v = tpl.vehicle;
  if (!v) return {};
  const [masculine, feminine] = pick(rng, vehicleColors);
  const letter = () => PLATE_LETTERS[int(rng, [0, PLATE_LETTERS.length - 1])];
  const plate = `${letter()}${letter()}-${int(rng, [100, 999])}-${letter()}${letter()}`;
  const car = v.kind === 'CAR';
  const type = (known: number, value: string, partial: string): Fact => ({ value, partial, knowledge: knowledgeOf(rng, known, personality, true) });
  return {
    VEHICLE_TYPE: type(
      v.known,
      car ? `C'est une ${pick(rng, carModels)}.` : `C'est un scooter ${pick(rng, scooterModels)}.`,
      car ? 'Je ne connais pas la marque, une petite voiture, genre citadine.' : 'Un scooter, je ne sais pas quelle marque.',
    ),
    VEHICLE_COLOR: type(v.known, car ? `Elle est ${feminine}.` : `Il est ${masculine}.`, car ? 'Plutôt foncée, je crois.' : 'Plutôt sombre, je crois.'),
    PLATE: type(v.plateKnown, `La plaque, c'est ${plate}.`, `Je n'ai retenu que le début : ${plate.slice(0, 2)}, je crois.`),
  };
}

/** Tire un appel entièrement aléatoire pour le poste `service`. */
export function generateCall(rng: Rng, service: ServiceType, now = 0): IncomingCall {
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

  const signalement = suspects > 0 ? describeSuspects(rng, suspects) : null;
  const suspectDirection = suspects > 0 ? describeFlight(rng, suspects, tpl) : '';

  // Détails demandables : propres au scénario, puis ceux de tout appel (quand, signalement, fuite, arme).
  const facts: Partial<Record<FactKey, Fact>> = { ...vehicleFacts(rng, tpl, person.value) };
  for (const [key, spec] of Object.entries(tpl.facts ?? {}) as [FactKey, FactSpec][]) facts[key] = fact(rng, spec, person.value);
  facts.WHEN ??= { value: pick(rng, WHEN[tpl.when ?? 'RECENT']), knowledge: 'FULL' };
  if (signalement) {
    facts.SUSPECT_DESC = { value: `${cap(signalement.full)}.`, partial: signalement.partial, knowledge: knowledgeOf(rng, 0.75, person.value, true) };
    facts.DIRECTION = {
      value: suspectDirection,
      partial: "Je l'ai vu partir, mais je ne sais pas où il est allé.",
      knowledge: knowledgeOf(rng, 0.85, person.value, true),
    };
    facts.WEAPON = { value: '', knowledge: knowledgeOf(rng, 0.85, person.value, false) };
  }

  return {
    id: `call-${Math.floor(rng() * 1e9).toString(36)}`,
    callerPhoneNumber: chance(rng, 0.15) ? 'Numéro masqué' : phone,
    callerStressLevel: int(rng, person.stress),
    receivedAt: now,
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
      suspectDescription: signalement?.full ?? '',
      suspectDirection,
      requiredUnits: int(rng, tpl.units),
      facts,
    },
  };
}
