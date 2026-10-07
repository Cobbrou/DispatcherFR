import { describe, expect, it } from 'vitest';
import type { Incident, Unit } from '../types';
import type { World } from './dispatch';
import { ON_SCENE_MIN, tick } from './tick';

const MIN = 60_000;
const HERE = { lat: 49.0, lng: 2.0 };
const THERE = { lat: 49.0, lng: 2.02 };
const route = { points: [HERE, THERE], cumMs: [0, 10 * MIN] };

const unit = (over: Partial<Unit> = {}): Unit => ({
  id: 'u1', callsign: 'U1', service: 'POLICE', type: 'PAM', status: 'EN_ROUTE', position: HERE,
  assignedIncidentId: 'F1', officersCount: 2, equipment: [], sectorId: 'inconnu',
  onSceneUntil: null, route, routeElapsedMs: 0, ...over,
});

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'F1', category: 'tapage', gravity: 3, callerLastName: '', callerFirstName: '', callerPhone: '',
  address: '', complement: '', description: '', coordinates: THERE, zone: 'POLICE', status: 'DISPATCHED',
  outcome: null, assignedUnits: ['u1'], logs: [], createdTimestamp: 0,
  pending: null, eventCount: 0, firstArrivalAt: null, neglected: false, ...over,
});

const world = (u = unit(), inc = incident()): World => ({ now: 0, units: { u1: u }, incidents: { F1: inc }, radio: [] });
const NEVER = () => 0.99; // aucun aléa

describe('tick', () => {
  it("avance l'horloge et la position le long de la route", () => {
    const w = tick(world(), 5 * MIN, NEVER);
    expect(w.now).toBe(5 * MIN);
    expect(w.units.u1.status).toBe('EN_ROUTE');
    expect(w.units.u1.routeElapsedMs).toBe(5 * MIN);
    expect(w.units.u1.position.lng).toBeCloseTo(2.01);
  });

  it("arrivée : temps de réponse à l'instant exact, temporisation sur place, radio", () => {
    const w = tick(world(), 30 * MIN, NEVER);
    expect(w.units.u1).toMatchObject({ status: 'SUR_LES_LIEUX', route: null, position: THERE });
    expect(w.units.u1.onSceneUntil).toBe(10 * MIN + ON_SCENE_MIN[3] * MIN);
    expect(w.incidents.F1.firstArrivalAt).toBe(10 * MIN);
    expect(w.incidents.F1.status).toBe('ON_SCENE');
    expect(w.radio.at(-1)?.text).toContain('arrivés sur les lieux');
  });

  it("sans route : le temps d'attente est crédité au roulage", () => {
    const w = tick(world(unit({ route: null })), 3 * MIN, NEVER);
    expect(w.units.u1.routeElapsedMs).toBe(3 * MIN);
    expect(w.units.u1.status).toBe('EN_ROUTE');
  });

  it("fin d'intervention : dernière unité, la fiche est clôturée avec une issue", () => {
    const onScene = unit({ status: 'SUR_LES_LIEUX', route: null, position: THERE, onSceneUntil: 5 * MIN });
    const w = tick(world(onScene, incident({ status: 'ON_SCENE', firstArrivalAt: MIN })), 6 * MIN, NEVER);
    expect(w.incidents.F1.status).toBe('RESOLVED');
    expect(w.incidents.F1.outcome).not.toBeNull();
    expect(w.units.u1.assignedIncidentId).toBeNull();
  });

  it("une demande de renfort retient l'équipage sur place", () => {
    const onScene = unit({ status: 'SUR_LES_LIEUX', route: null, position: THERE, onSceneUntil: 5 * MIN });
    const inc = incident({ status: 'ON_SCENE', pending: { kind: 'RENFORT', at: 0, by: 'U1' } });
    const w = tick(world(onScene, inc), 6 * MIN, NEVER);
    expect(w.units.u1.status).toBe('SUR_LES_LIEUX');
  });

  it('retour à la brigade : avance puis passe disponible au poste', () => {
    const back = unit({ status: 'DISPO_ON_ZONE', assignedIncidentId: null });
    const mid = tick(world(back, incident({ status: 'RESOLVED' })), 5 * MIN, NEVER);
    expect(mid.units.u1.status).toBe('DISPO_ON_ZONE');
    expect(mid.units.u1.routeElapsedMs).toBe(5 * MIN);
    const home = tick(mid, 6 * MIN, NEVER);
    expect(home.units.u1).toMatchObject({ status: 'DISPO_POSTE', route: null, position: THERE });
  });
});
