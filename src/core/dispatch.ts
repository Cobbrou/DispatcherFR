import { salleOf } from '../data/radio';
import type { GameState, Incident, IncidentOutcome, Unit } from '../types';
import { canIncident, canUnit } from './statusMachine';

/** Partie de l'état que le moteur de dispatch lit et modifie. */
export type World = Pick<GameState, 'now' | 'units' | 'incidents' | 'radio'>;

const OPERATOR = 'OPERATEUR_1';
const RADIO_KEPT = 200;

/** Ajoute un message au fil radio (les plus anciens sont oubliés). */
export function radio<W extends World>(w: W, from: string, to: string, text: string, urgent = false): W {
  const id = String(Number(w.radio.at(-1)?.id ?? 0) + 1);
  return { ...w, radio: [...w.radio, { id, timestamp: w.now, from, to, text, urgent }].slice(-RADIO_KEPT) };
}

export const setUnit = <W extends World>(w: W, u: Unit): W => ({ ...w, units: { ...w.units, [u.id]: u } });

export function patchIncident<W extends World>(
  w: W,
  id: string,
  patch: Partial<Incident>,
  log?: [author: string, message: string],
): W {
  const inc = w.incidents[id];
  const logs = log ? [...inc.logs, { timestamp: w.now, author: log[0], message: log[1] }] : inc.logs;
  return { ...w, incidents: { ...w.incidents, [id]: { ...inc, ...patch, logs } } };
}

const attached = (w: World, id: string) => Object.values(w.units).filter((u) => u.assignedIncidentId === id);

/** Statut d'une fiche ouverte, déduit des unités rattachées. */
export function sync<W extends World>(w: W, id: string): W {
  const inc = w.incidents[id];
  if (!inc || inc.status === 'RESOLVED' || inc.status === 'FAILED') return w;
  const mine = attached(w, id);
  const status = mine.some((u) => u.status === 'SUR_LES_LIEUX') ? 'ON_SCENE' : mine.length ? 'DISPATCHED' : 'PENDING';
  return status === inc.status || !canIncident(inc.status, status) ? w : patchIncident(w, id, { status });
}

/** Engage une unité disponible sur une fiche géolocalisée. Sans effet si impossible. */
export function assignUnit<W extends World>(w: W, unitId: string, incidentId: string): W {
  const u = w.units[unitId];
  const inc = w.incidents[incidentId];
  if (!u || !inc || !inc.coordinates || (inc.status !== 'PENDING' && inc.status !== 'DISPATCHED' && inc.status !== 'ON_SCENE')) return w;
  if (!canUnit(u.status, 'EN_ROUTE')) return w;
  const salle = salleOf(inc.zone);
  const support = inc.pending?.kind === 'RENFORT' ? `, en renfort de ${inc.pending.by}` : '';
  let next = setUnit(w, { ...u, status: 'EN_ROUTE', assignedIncidentId: incidentId, onSceneUntil: null, route: null, routeElapsedMs: 0 });
  next = radio(next, salle, u.callsign, `${u.callsign} de ${salle}, engagez sur ${inc.address}, ${inc.category}${support}.`);
  next = radio(next, u.callsign, salle, `${u.callsign}, tenu, nous nous rendons sur place.`);
  return sync(
    patchIncident(next, incidentId, { assignedUnits: [...new Set([...inc.assignedUnits, unitId])] }, [OPERATOR, `${u.callsign} engagé`]),
    incidentId,
  );
}

/** Rappelle une unité encore en route. */
export function unassignUnit<W extends World>(w: W, unitId: string): W {
  const u = w.units[unitId];
  if (!u || u.status !== 'EN_ROUTE' || !u.assignedIncidentId) return w;
  const id = u.assignedIncidentId;
  const salle = salleOf(w.incidents[id].zone);
  const next = radio(
    setUnit(w, { ...u, status: 'DISPO_ON_ZONE', assignedIncidentId: null, route: null, routeElapsedMs: 0 }),
    salle, u.callsign, `${u.callsign} de ${salle}, annulez l'engagement, reprenez votre secteur.`,
  );
  return sync(
    patchIncident(next, id, { assignedUnits: w.incidents[id].assignedUnits.filter((x) => x !== unitId) }, [OPERATOR, `${u.callsign} désengagé`]),
    id,
  );
}

/** Clôture une fiche en attente, sans intervention (renseignement, fausse alerte). */
export function closeIncident<W extends World>(w: W, id: string, outcome: IncidentOutcome): W {
  const inc = w.incidents[id];
  if (!inc || !canIncident(inc.status, 'RESOLVED') || attached(w, id).length) return w;
  return patchIncident(w, id, { status: 'RESOLVED', outcome }, [OPERATOR, 'Fiche clôturée sans intervention']);
}
