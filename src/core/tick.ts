import { positionAt, routeDurationMs } from '../lib/route';
import type { GravityLevel } from '../types';
import { patchIncident, setUnit, sync, type World } from './dispatch';

/** Temporisation d'intervention sur place (minutes simulées), selon la gravité. */
export const ON_SCENE_MIN: Record<GravityLevel, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30 };

/** Fait avancer le monde de `dtMs` millisecondes simulées. */
export function tick<W extends World>(w: W, dtMs: number): W {
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
      next = patchIncident(next, inc.id, {}, [u.callsign, `De ${u.callsign} pour salle, arrivés sur les lieux`]);
      next = sync(next, inc.id);
    } else if (u.status === 'SUR_LES_LIEUX' && u.onSceneUntil !== null && next.now >= u.onSceneUntil) {
      next = setUnit(next, { ...u, status: 'DISPO_ON_ZONE', assignedIncidentId: null, onSceneUntil: null });
      next = patchIncident(next, inc.id, {}, [u.callsign, `De ${u.callsign} pour salle, fin d'intervention, disponibles sur secteur`]);
      const left = Object.values(next.units).some((x) => x.assignedIncidentId === inc.id);
      // ponytail: toute fiche dont les unités ont fini est « pacifiée » ; l'issue réelle viendra avec les aléas (étape 4)
      next = left
        ? sync(next, inc.id)
        : patchIncident(next, inc.id, { status: 'RESOLVED', outcome: 'PACIFIE' }, ['SYSTEME', 'Fiche clôturée : intervention terminée']);
    }
  }
  return next;
}
