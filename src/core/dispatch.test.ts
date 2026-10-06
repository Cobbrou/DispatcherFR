import { describe, expect, it } from 'vitest';
import { distanceM, moveToward } from '../lib/geo';
import { buildRoute, positionAt, remainingPath, straightRoute } from '../lib/route';
import type { Incident, Unit } from '../types';
import { assignUnit, closeIncident, unassignUnit, type World } from './dispatch';
import { canIncident, canUnit } from './statusMachine';
import { tick } from './tick';

// RNG fixe : aucun aléa, issue « pacifiée ».
const step = (w: World, ms: number) => tick(w, ms, () => 0.5);

const BASE = { lat: 48.54, lng: 2.65 };
const SCENE = { lat: 48.5495, lng: 2.65 }; // ≈ 1 057 m au nord

const unit = (id: string, status: Unit['status'] = 'DISPO_ON_ZONE'): Unit => ({
  id, callsign: id.toUpperCase(), service: 'POLICE', type: 'PAM', status, position: BASE,
  assignedIncidentId: null, officersCount: 2, equipment: [], sectorId: 'csp-melun', onSceneUntil: null,
  route: null, routeElapsedMs: 0,
});

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'F1', category: 'tapage', gravity: 2, callerLastName: '', callerFirstName: '', callerPhone: '',
  address: 'x', complement: '', description: '',
  coordinates: SCENE, zone: 'POLICE', status: 'PENDING',
  outcome: null, assignedUnits: [], logs: [], createdTimestamp: 0,
  pending: null, eventCount: 0, firstArrivalAt: null, neglected: false, ...over,
});

const world = (inc = incident()): World => ({
  now: 0,
  units: { u1: unit('u1'), u2: unit('u2') },
  incidents: { F1: inc },
  radio: [],
});

const MIN = 60_000;

/** Engage puis fournit l'itinéraire (en jeu, il arrive de façon asynchrone). */
const dispatched = (w: World, id: string) => {
  const next = assignUnit(w, id, 'F1');
  return { ...next, units: { ...next.units, [id]: { ...next.units[id], route: straightRoute(BASE, SCENE) } } };
};

describe('géométrie', () => {
  it('mesure et avance en ligne droite', () => {
    expect(distanceM(BASE, SCENE)).toBeGreaterThan(1000);
    expect(distanceM(BASE, SCENE)).toBeLessThan(1100);
    expect(moveToward(BASE, SCENE, 1e6)).toEqual(SCENE);
    expect(distanceM(moveToward(BASE, SCENE, 500), SCENE)).toBeCloseTo(distanceM(BASE, SCENE) - 500, 0);
  });
});

describe('machine à statuts', () => {
  it('rejette les transitions illégales', () => {
    expect(canUnit('DISPO_POSTE', 'EN_ROUTE')).toBe(true);
    expect(canUnit('SUR_LES_LIEUX', 'EN_ROUTE')).toBe(false);
    expect(canUnit('INDISPONIBLE', 'EN_ROUTE')).toBe(false);
    expect(canIncident('PENDING', 'ON_SCENE')).toBe(false);
    expect(canIncident('RESOLVED', 'PENDING')).toBe(false);
  });
});

describe('engagement', () => {
  it('engage : unité en route, fiche engagée, journal', () => {
    const w = assignUnit(world(), 'u1', 'F1');
    expect(w.units.u1).toMatchObject({ status: 'EN_ROUTE', assignedIncidentId: 'F1' });
    expect(w.incidents.F1.status).toBe('DISPATCHED');
    expect(w.incidents.F1.assignedUnits).toEqual(['u1']);
    expect(w.incidents.F1.logs.at(-1)?.message).toBe('U1 engagé');
  });

  it('refuse : unité déjà engagée ou indisponible, fiche sans coordonnées ou close', () => {
    const w = assignUnit(world(), 'u1', 'F1');
    expect(assignUnit(w, 'u1', 'F1')).toBe(w);
    const busy = { ...world(), units: { u1: unit('u1', 'INDISPONIBLE') } };
    expect(assignUnit(busy, 'u1', 'F1')).toBe(busy);
    const unplaced = world(incident({ coordinates: null }));
    expect(assignUnit(unplaced, 'u1', 'F1')).toBe(unplaced);
    const done = world(incident({ status: 'RESOLVED' }));
    expect(assignUnit(done, 'u1', 'F1')).toBe(done);
  });

  it('rappelle une unité en route : la fiche redevient en attente', () => {
    const w = unassignUnit(assignUnit(world(), 'u1', 'F1'), 'u1');
    expect(w.units.u1).toMatchObject({ status: 'DISPO_ON_ZONE', assignedIncidentId: null });
    expect(w.incidents.F1).toMatchObject({ status: 'PENDING', assignedUnits: [] });
  });

  it('clôture sans intervention seulement si aucune unité rattachée', () => {
    const engaged = assignUnit(world(), 'u1', 'F1');
    expect(closeIncident(engaged, 'F1', 'FAUSSE_ALERTE')).toBe(engaged);
    expect(closeIncident(world(), 'F1', 'FAUSSE_ALERTE').incidents.F1).toMatchObject({ status: 'RESOLVED', outcome: 'FAUSSE_ALERTE' });
  });
});

describe('tick', () => {
  it('déplacement → sur les lieux → temporisation → disponible, fiche résolue', () => {
    let w = dispatched(world(), 'u1');

    w = step(w, 30_000); // 30 s : ≈ 417 m, pas encore arrivée
    expect(w.units.u1.status).toBe('EN_ROUTE');
    expect(distanceM(w.units.u1.position, SCENE)).toBeLessThan(distanceM(BASE, SCENE));
    expect(w.units.u2.position).toEqual(BASE);

    w = step(w, 2 * MIN); // ≈ 1 057 m à 13,9 m/s : arrivée
    expect(w.units.u1).toMatchObject({ status: 'SUR_LES_LIEUX', position: SCENE });
    expect(w.incidents.F1.status).toBe('ON_SCENE');
    expect(w.units.u1.onSceneUntil).toBe(w.now + 10 * MIN); // gravité 2 → 10 min

    w = step(w, 9 * MIN);
    expect(w.units.u1.status).toBe('SUR_LES_LIEUX');

    w = step(w, 2 * MIN);
    expect(w.units.u1).toMatchObject({ status: 'DISPO_ON_ZONE', assignedIncidentId: null, onSceneUntil: null });
    expect(w.incidents.F1).toMatchObject({ status: 'RESOLVED', outcome: 'PACIFIE' });
  });

  it('la fiche reste ouverte tant qu\'une autre unité y est rattachée', () => {
    let w = dispatched(dispatched(world(), 'u1'), 'u2');
    w = step(w, 2 * MIN); // les deux arrivent au même instant
    w = { ...w, units: { ...w.units, u1: { ...w.units.u1, onSceneUntil: w.now } } };
    w = step(w, 1000);
    expect(w.units.u1.status).toBe('DISPO_ON_ZONE');
    expect(w.units.u2.status).toBe('SUR_LES_LIEUX');
    expect(w.incidents.F1.status).toBe('ON_SCENE');
  });

  it('attend son itinéraire avant de rouler', () => {
    const w = step(assignUnit(world(), 'u1', 'F1'), 10 * MIN);
    expect(w.units.u1).toMatchObject({ status: 'EN_ROUTE', position: BASE });
  });

  it('suit le tracé, à la vitesse de chaque tronçon', () => {
    const a = { lat: 0, lng: 0 }, b = { lat: 0, lng: 1 }, c = { lat: 1, lng: 1 };
    const r = buildRoute([a, b, c], [10, 40], 1); // tronçon 1 rapide, tronçon 2 lent
    expect(positionAt(r, 5_000)).toEqual({ lat: 0, lng: 0.5 });
    expect(positionAt(r, 30_000)).toEqual({ lat: 0.5, lng: 1 });
    expect(positionAt(r, 1e9)).toEqual(c);
    expect(remainingPath(r, 30_000)).toEqual([{ lat: 0.5, lng: 1 }, c]);
  });

  it('une fiche non placée n\'attire personne', () => {
    const w = { ...dispatched(world(), 'u1') };
    w.incidents = { F1: { ...w.incidents.F1, coordinates: null } };
    expect(step(w, 10 * MIN).units.u1.position).toEqual(BASE);
  });
});
