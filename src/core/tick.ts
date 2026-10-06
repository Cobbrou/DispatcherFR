import { END_MESSAGE, salleOf } from '../data/radio';
import { OUTCOME_LABEL } from '../data/statuses';
import { positionAt, routeDurationMs } from '../lib/route';
import type { Rng } from '../lib/rng';
import type { GravityLevel } from '../types';
import { patchIncident, radio, setUnit, sync, type World } from './dispatch';
import { drawOutcome, expire, rollEvents } from './events';

/** Temporisation d'intervention sur place (minutes simulées), selon la gravité. */
export const ON_SCENE_MIN: Record<GravityLevel, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30 };

/** Fait avancer le monde de `dtMs` millisecondes simulées. `rng` tire les aléas et les issues (injectable pour les tests). */
export function tick<W extends World>(w: W, dtMs: number, rng: Rng = Math.random): W {
  let next: W = { ...w, now: w.now + dtMs };
  for (const u of Object.values(w.units)) {
    const inc = u.assignedIncidentId ? next.incidents[u.assignedIncidentId] : undefined;
    if (!inc) continue;

    if (u.status === 'EN_ROUTE' && inc.coordinates) {
      if (!u.route) continue; // itinéraire en cours de calcul
      const elapsed = u.routeElapsedMs + dtMs;
      if (elapsed < routeDurationMs(u.route)) {
        next = setUnit(next, { ...u, routeElapsedMs: elapsed, position: positionAt(u.route, elapsed) });
        continue;
      }
      next = setUnit(next, {
        ...u,
        position: inc.coordinates,
        route: null,
        routeElapsedMs: 0,
        status: 'SUR_LES_LIEUX',
        onSceneUntil: next.now + ON_SCENE_MIN[inc.gravity] * 60_000,
      });
      const salle = salleOf(inc.zone);
      const text = `De ${u.callsign} pour ${salle}, arrivés sur les lieux.`;
      next = radio(next, u.callsign, salle, text);
      // Un renfort demandé est satisfait dès qu'une autre unité arrive.
      const reinforced = inc.pending?.kind === 'RENFORT' && inc.pending.by !== u.callsign;
      next = patchIncident(next, inc.id, { firstArrivalAt: inc.firstArrivalAt ?? next.now, ...(reinforced && { pending: null }) }, [u.callsign, text]);
      next = sync(next, inc.id);
    } else if (u.status === 'SUR_LES_LIEUX' && u.onSceneUntil !== null && next.now >= u.onSceneUntil && !inc.pending) {
      // Une demande de renfort ou de secours en attente retient l'équipage sur place.
      next = setUnit(next, { ...u, status: 'DISPO_ON_ZONE', assignedIncidentId: null, onSceneUntil: null });
      const salle = salleOf(inc.zone);
      const last = !Object.values(next.units).some((x) => x.assignedIncidentId === inc.id);
      const outcome = last ? drawOutcome(rng) : null;
      const text = outcome ? END_MESSAGE[outcome](u.callsign, salle) : `De ${u.callsign} pour ${salle}, fin d'intervention, disponibles sur secteur.`;
      next = radio(next, u.callsign, salle, text);
      next = patchIncident(next, inc.id, {}, [u.callsign, text]);
      next = outcome
        ? patchIncident(next, inc.id, { status: 'RESOLVED', outcome }, ['SYSTEME', `Fiche clôturée : ${OUTCOME_LABEL[outcome].toLowerCase()}`])
        : sync(next, inc.id);
    }
  }
  return expire(rollEvents(next, dtMs, rng));
}
