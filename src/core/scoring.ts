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
  satisfaction: number | null;        // 0-100, moyenne sur les fiches closes
}

const closed = (i: Incident) => i.status === 'RESOLVED' || i.status === 'FAILED';
const responseMin = (i: Incident) => (i.firstArrivalAt === null ? null : (i.firstArrivalAt - i.createdTimestamp) / 60_000);

/** Satisfaction de l'administré : 0 si échec, sinon pénalisée par le retard et les secours oubliés. */
export function satisfaction(i: Incident): number {
  if (i.status === 'FAILED') return 0;
  let s = 100;
  const target = RESPONSE_TARGET_MIN[i.gravity];
  const r = responseMin(i);
  if (target && r !== null && r > target) s -= Math.min(60, (r / target - 1) * 40);
  if (i.neglected) s -= 25;
  return Math.max(0, s);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Bilan de la journée à partir des fiches (l'état du jeu est la seule source). */
export function buildReport(incidents: Incident[]): Report {
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
    satisfaction: mean(done.map(satisfaction)),
  };
}
