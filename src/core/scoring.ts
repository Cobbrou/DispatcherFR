import { categoryByLabel } from '../data/categories';
import { RESPONSE_TARGET_MIN } from '../data/statuses';
import type { Incident, IncidentOutcome } from '../types';

export interface Report {
  total: number;                      // fiches créées
  open: number;
  resolved: number;
  failed: number;
  avgResponseMin: number | null;      // création → première unité sur les lieux
  onTimePct: number | null;           // arrivées dans le délai cible de la gravité
  outcomes: Record<IncidentOutcome, number>;
  neglected: number;                  // secours non alertés à temps
  abandoned: number;                  // appels raccrochés en file d'attente
  underEngaged: number;               // fiches résolues avec moins d'unités que nécessaire
  overEngaged: number;                // fiches closes avec plus d'unités que nécessaire
  underRated: number;                 // fiches closes dont la gravité saisie est sous la réalité
  satisfaction: number | null;        // 0-100, moyenne sur les fiches closes et les appels abandonnés (0)
}

const closed = (i: Incident) => i.status === 'RESOLVED' || i.status === 'FAILED';
const responseMin = (i: Incident) => (i.firstArrivalAt === null ? null : (i.firstArrivalAt - i.createdTimestamp) / 60_000);

/** Niveaux de gravité manquants entre la catégorie réelle des faits et celle saisie (0 si inconnue ou surévaluée). */
const trueLevel = (i: Incident) => (i.trueCategory ? categoryByLabel.get(i.trueCategory)?.level : undefined);
export const underRating = (i: Incident) => Math.max(0, (trueLevel(i) ?? i.gravity) - i.gravity);

/** Unités manquantes d'une fiche résolue (un simple renseignement n'en demande pas). */
export const missingUnits = (i: Incident) =>
  i.requiredUnits === undefined || i.status !== 'RESOLVED' || (trueLevel(i) ?? i.gravity) <= 1 ? 0 : Math.max(0, i.requiredUnits - i.assignedUnits.length);

/** Unités en trop ; chaque aléa (renfort, secours) en justifie une de plus. */
export const surplusUnits = (i: Incident) => (i.requiredUnits === undefined ? 0 : Math.max(0, i.assignedUnits.length - i.requiredUnits - i.eventCount));

/** Satisfaction de l'administré : 0 si échec, sinon pénalisée par le retard, les secours oubliés et les erreurs d'évaluation. */
export function satisfaction(i: Incident): number {
  if (i.status === 'FAILED') return 0;
  let s = 100;
  const target = RESPONSE_TARGET_MIN[i.gravity];
  const r = responseMin(i);
  if (target && r !== null && r > target) s -= Math.min(60, (r / target - 1) * 40);
  if (i.neglected) s -= 25;
  s -= Math.min(30, 15 * missingUnits(i)) + Math.min(15, 5 * surplusUnits(i)) + Math.min(30, 10 * underRating(i));
  return Math.max(0, s);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Bilan de la journée à partir des fiches et des appels abandonnés (l'état du jeu est la seule source). */
export function buildReport(incidents: Incident[], abandoned = 0): Report {
  const done = incidents.filter(closed);
  const outcomes: Record<IncidentOutcome, number> = { INTERPELLE: 0, PACIFIE: 0, FAUSSE_ALERTE: 0, FUITE: 0 };
  for (const i of done) if (i.outcome) outcomes[i.outcome]++;
  // Une fiche échouée sans qu'aucune unité soit arrivée compte comme délai manqué.
  const timed = incidents.filter((i) => RESPONSE_TARGET_MIN[i.gravity] && (responseMin(i) !== null || i.status === 'FAILED'));
  return {
    total: incidents.length,
    open: incidents.length - done.length,
    resolved: done.filter((i) => i.status === 'RESOLVED').length,
    failed: done.filter((i) => i.status === 'FAILED').length,
    avgResponseMin: mean(incidents.map(responseMin).filter((r): r is number => r !== null)),
    onTimePct: timed.length ? (100 * timed.filter((i) => responseMin(i) !== null && responseMin(i)! <= RESPONSE_TARGET_MIN[i.gravity]!).length) / timed.length : null,
    outcomes,
    neglected: incidents.filter((i) => i.neglected).length,
    abandoned,
    underEngaged: done.filter((i) => missingUnits(i) > 0).length,
    overEngaged: done.filter((i) => surplusUnits(i) > 0).length,
    underRated: done.filter((i) => underRating(i) > 0).length,
    satisfaction: mean([...done.map(satisfaction), ...Array<number>(abandoned).fill(0)]),
  };
}
