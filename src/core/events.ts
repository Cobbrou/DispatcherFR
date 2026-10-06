import { FAIL_AFTER_MIN } from '../data/statuses';
import { CONCOURS, REINFORCEMENT_REASONS, salleOf } from '../data/radio';
import { pick, type Rng } from '../lib/rng';
import type { ConcoursService, GravityLevel, Incident, IncidentOutcome, PendingEvent } from '../types';
import { patchIncident, radio, releaseUnit, setUnit, type World } from './dispatch';
import { canIncident } from './statusMachine';

/** Probabilité d'aléa par minute simulée, selon la gravité de la fiche. */
const PER_MINUTE: Record<PendingEvent['kind'], (g: GravityLevel) => number> = {
  RENFORT: (g) => 0.006 * g,
  SECOURS: (g) => (g >= 2 ? 0.004 : 0),
};
const MAX_EVENTS = 2;
/** Délai laissé à l'opérateur pour répondre (minutes simulées). */
const ANSWER_MIN: Record<PendingEvent['kind'], number> = { RENFORT: 10, SECOURS: 5 };

const OUTCOMES: { value: IncidentOutcome; weight: number }[] = [
  { value: 'PACIFIE', weight: 55 },
  { value: 'INTERPELLE', weight: 30 },
  { value: 'FAUSSE_ALERTE', weight: 15 },
];

/** Issue d'une intervention menée à son terme. */
export function drawOutcome(rng: Rng): IncidentOutcome {
  let r = rng() * 100;
  for (const o of OUTCOMES) if ((r -= o.weight) < 0) return o.value;
  return 'PACIFIE';
}

const onScene = (w: World, id: string) =>
  Object.values(w.units).filter((u) => u.assignedIncidentId === id && u.status === 'SUR_LES_LIEUX');

/** Tire d'éventuels aléas sur les fiches où une unité est sur place (une demande à la fois, deux au plus par fiche). */
export function rollEvents<W extends World>(w: W, dtMs: number, rng: Rng): W {
  let next = w;
  const minutes = dtMs / 60_000;
  for (const inc of Object.values(w.incidents)) {
    if (inc.status !== 'ON_SCENE' || inc.pending || inc.eventCount >= MAX_EVENTS) continue;
    const unit = onScene(next, inc.id)[0];
    if (!unit) continue;
    // Un seul tirage par fiche et par tick : la partie ne dépend pas de la cadence d'affichage.
    const p = (k: PendingEvent['kind']) => 1 - (1 - PER_MINUTE[k](inc.gravity)) ** minutes;
    const draw = rng();
    const kind = draw < p('RENFORT') ? 'RENFORT' : draw < p('RENFORT') + p('SECOURS') ? 'SECOURS' : null;
    if (!kind) continue;

    const salle = salleOf(inc.zone);
    // Le service des routes n'est demandé que sur la voie publique.
    const services: ConcoursService[] = /circulation|accident/i.test(inc.category) ? ['SAMU', 'pompiers', 'routes'] : ['SAMU', 'pompiers'];
    const service = kind === 'SECOURS' ? pick(rng, services) : undefined;
    const text =
      kind === 'RENFORT'
        ? `De ${unit.callsign} pour ${salle}, message urgent : ${pick(rng, REINFORCEMENT_REASONS)}, nous demandons un renfort.`
        : `De ${unit.callsign} pour ${salle}, ${CONCOURS[service!].reason}, demandons le concours ${CONCOURS[service!].de}.`;
    next = radio(next, unit.callsign, salle, text, true);
    next = patchIncident(next, inc.id, { pending: { kind, at: next.now, by: unit.callsign, service }, eventCount: inc.eventCount + 1 }, [unit.callsign, text]);
  }
  return next;
}

/** Clôture en échec : les unités rattachées sont libérées. */
function failIncident<W extends World>(w: W, inc: Incident, outcome: IncidentOutcome, message: string): W {
  let next = w;
  for (const u of Object.values(w.units).filter((x) => x.assignedIncidentId === inc.id))
    next = setUnit(next, releaseUnit(u));
  return patchIncident(next, inc.id, { status: 'FAILED', outcome, pending: null }, ['SYSTEME', message]);
}

/** Aléas restés sans réponse et fiches laissées trop longtemps sans unité sur les lieux. */
export function expire<W extends World>(w: W): W {
  let next = w;
  for (const inc of Object.values(w.incidents)) {
    if (inc.status === 'RESOLVED' || inc.status === 'FAILED') continue;
    const salle = salleOf(inc.zone);
    const { pending } = inc;

    if (pending && next.now - pending.at >= ANSWER_MIN[pending.kind] * 60_000) {
      if (pending.kind === 'RENFORT') {
        next = radio(next, pending.by, salle, `De ${pending.by} pour ${salle}, nous perdons le contrôle, les individus prennent la fuite.`, true);
        next = failIncident(next, inc, 'FUITE', 'Renfort non engagé à temps : situation perdue, auteurs en fuite');
      } else {
        const who = CONCOURS[pending.service!].direct;
        next = radio(next, pending.by, salle, `De ${pending.by} pour ${salle}, sans réponse de votre part, nous alertons directement ${who}.`);
        next = patchIncident(next, inc.id, { pending: null, neglected: true }, ['SYSTEME', "Secours non alertés par la salle : l'équipage les appelle lui-même"]);
      }
      continue;
    }

    const limit = FAIL_AFTER_MIN[inc.gravity];
    if (limit !== null && inc.status !== 'ON_SCENE' && inc.firstArrivalAt === null && canIncident(inc.status, 'FAILED') && next.now - inc.createdTimestamp >= limit * 60_000)
      next = failIncident(next, inc, 'FUITE', "Délai d'intervention dépassé : plus personne sur les lieux");
  }
  return next;
}

/** L'opérateur alerte le SAMU / les pompiers demandés par l'équipage. */
export function alertRescue<W extends World>(w: W, id: string): W {
  const inc = w.incidents[id];
  if (inc?.pending?.kind !== 'SECOURS') return w;
  const { by, service } = inc.pending;
  const salle = salleOf(inc.zone);
  const who = CONCOURS[service!].alerted;
  const next = radio(w, salle, by, `${by}, de ${salle}, bien reçu, ${who}, ils arrivent.`);
  return patchIncident(next, id, { pending: null }, ['OPERATEUR_1', who]);
}
