import { describe, expect, it } from 'vitest';
import type { Incident, Unit } from '../types';
import { buildReport, satisfaction } from './scoring';
import { alertRescue, drawOutcome, expire, rollEvents } from './events';
import { assignUnit, type World } from './dispatch';
import { tick } from './tick';

const MIN = 60_000;
const SPOT = { lat: 48.54, lng: 2.65 };

const unit = (id: string, status: Unit['status'], incidentId: string | null = null): Unit => ({
  id, callsign: id.toUpperCase(), service: 'POLICE', type: 'PAM', status, position: SPOT,
  assignedIncidentId: incidentId, officersCount: 2, equipment: [], sectorId: 'csp-melun',
  onSceneUntil: status === 'SUR_LES_LIEUX' ? 5 * MIN : null, route: null, routeElapsedMs: 0,
});

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'F1', category: 'tapage', gravity: 5, callerLastName: '', callerFirstName: '', callerPhone: '',
  address: '1 rue Carnot, Melun', complement: '', description: '', coordinates: SPOT, zone: 'POLICE', status: 'ON_SCENE',
  outcome: null, assignedUnits: ['u1'], logs: [], createdTimestamp: 0,
  pending: null, eventCount: 0, firstArrivalAt: 2 * MIN, neglected: false, ...over,
});

const world = (inc = incident()): World => ({
  now: 0, units: { u1: unit('u1', 'SUR_LES_LIEUX', 'F1'), u2: unit('u2', 'DISPO_ON_ZONE') }, incidents: { F1: inc }, radio: [],
});

describe('aléas', () => {
  it('tire un renfort, qui retient l\'équipage sur place', () => {
    let w = rollEvents(world(), MIN, () => 0); // rng = 0 : tout se déclenche
    expect(w.incidents.F1.pending).toMatchObject({ kind: 'RENFORT', by: 'U1' });
    expect(w.incidents.F1.eventCount).toBe(1);
    expect(w.radio.at(-1)).toMatchObject({ from: 'U1', to: 'CIC', urgent: true });
    expect(w.radio.at(-1)?.text).toContain('demandons un renfort');

    w = tick(w, 9 * MIN, () => 0.99); // après la fin de temporisation (5 min), avant le délai de réponse (10 min)
    expect(w.units.u1.status).toBe('SUR_LES_LIEUX');
  });

  it('rien sans rng favorable, ni avant une unité sur place, ni au-delà de 2 aléas', () => {
    expect(rollEvents(world(), MIN, () => 0.99).incidents.F1.pending).toBeNull();
    expect(rollEvents(world(incident({ status: 'PENDING' })), MIN, () => 0).incidents.F1.pending).toBeNull();
    expect(rollEvents(world(incident({ eventCount: 2 })), MIN, () => 0).incidents.F1.pending).toBeNull();
  });

  it('le renfort arrivé lève la demande ; la fiche se clôt ensuite', () => {
    let w = rollEvents(world(), MIN, () => 0);
    w = assignUnit(w, 'u2', 'F1');
    expect(w.radio.at(-2)?.text).toContain('en renfort de U1');
    w = { ...w, units: { ...w.units, u2: { ...w.units.u2, route: { points: [SPOT, SPOT], cumMs: [0, 1000] } } } };
    w = tick(w, 2000, () => 0.99);
    expect(w.units.u2.status).toBe('SUR_LES_LIEUX');
    expect(w.incidents.F1.pending).toBeNull();
  });

  it('renfort sans réponse : fiche en échec, unités libérées', () => {
    let w = rollEvents(world(), MIN, () => 0);
    w = expire({ ...w, now: w.now + 10 * MIN });
    expect(w.incidents.F1).toMatchObject({ status: 'FAILED', outcome: 'FUITE', pending: null });
    expect(w.units.u1).toMatchObject({ status: 'DISPO_ON_ZONE', assignedIncidentId: null });
  });

  it('secours : alertés par l\'opérateur, ou oubliés (fiche négligée)', () => {
    const w = world(incident({ pending: { kind: 'SECOURS', at: 0, by: 'U1', service: 'SAMU' } }));
    const ok = alertRescue(w, 'F1');
    expect(ok.incidents.F1.pending).toBeNull();
    expect(ok.incidents.F1.neglected).toBe(false);
    expect(ok.radio.at(-1)?.text).toContain('SAMU (15) alerté');
    expect(alertRescue(ok, 'F1')).toBe(ok);

    const late = expire({ ...w, now: 5 * MIN });
    expect(late.incidents.F1).toMatchObject({ pending: null, neglected: true, status: 'ON_SCENE' });
  });

  it('délai dépassé sans unité sur place : échec', () => {
    const w = world(incident({ status: 'PENDING', assignedUnits: [], firstArrivalAt: null }));
    expect(expire({ ...w, now: 14 * MIN }).incidents.F1.status).toBe('PENDING');
    expect(expire({ ...w, now: 15 * MIN }).incidents.F1).toMatchObject({ status: 'FAILED', outcome: 'FUITE' });
    // gravité 1 : pas de délai d'échec
    expect(expire({ ...world(incident({ status: 'PENDING', gravity: 1, firstArrivalAt: null })), now: 1e9 }).incidents.F1.status).toBe('PENDING');
  });

  it("pas d'échec par délai une fois qu'une unité est déjà arrivée (renfort encore en route)", () => {
    const w = world(incident({ status: 'DISPATCHED', firstArrivalAt: 2 * MIN }));
    expect(expire({ ...w, now: 60 * MIN }).incidents.F1.status).toBe('DISPATCHED');
  });

  it('un seul tirage par fiche et par tick', () => {
    let draws = 0;
    rollEvents(world(), MIN, () => (draws++, 0.99));
    expect(draws).toBe(1);
  });

  it('issues tirées selon les poids', () => {
    expect([drawOutcome(() => 0), drawOutcome(() => 0.6), drawOutcome(() => 0.95)]).toEqual(['PACIFIE', 'INTERPELLE', 'FAUSSE_ALERTE']);
  });
});

describe('bilan', () => {
  const done = (over: Partial<Incident>) => incident({ status: 'RESOLVED', outcome: 'PACIFIE', ...over });

  it('satisfaction : retard, secours oubliés, échec', () => {
    expect(satisfaction(done({ firstArrivalAt: 4 * MIN }))).toBe(100);              // dans le délai de 5 min
    expect(satisfaction(done({ firstArrivalAt: 10 * MIN }))).toBe(60);              // 2× le délai : −40
    expect(satisfaction(done({ firstArrivalAt: 4 * MIN, neglected: true }))).toBe(75);
    expect(satisfaction(incident({ status: 'FAILED', outcome: 'FUITE' }))).toBe(0);
  });

  it('agrège temps de réponse, délais tenus et issues', () => {
    const r = buildReport([
      done({ id: 'A', firstArrivalAt: 4 * MIN }),
      done({ id: 'B', firstArrivalAt: 10 * MIN, outcome: 'INTERPELLE' }),
      incident({ id: 'C', status: 'FAILED', outcome: 'FUITE', firstArrivalAt: null }),
      incident({ id: 'D' }),
    ]);
    expect(r).toMatchObject({ total: 4, open: 1, resolved: 2, failed: 1, onTimePct: 50 }); // A et D dans le délai, B en retard, C échouée sans arrivée
    expect(r.avgResponseMin).toBeCloseTo((4 + 10 + 2) / 3);
    expect(r.outcomes).toMatchObject({ PACIFIE: 1, INTERPELLE: 1, FUITE: 1 });
    expect(r.satisfaction).toBeCloseTo((100 + 60 + 0) / 3);
    expect(buildReport([]).satisfaction).toBeNull();
  });
});
