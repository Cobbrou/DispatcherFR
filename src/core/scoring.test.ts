import { describe, expect, it } from 'vitest';
import type { Incident } from '../types';
import { buildReport, missingUnits, surplusUnits, underRating } from './scoring';

const MIN = 60_000;

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'F1', category: 'tapage', gravity: 5, callerLastName: '', callerFirstName: '', callerPhone: '',
  address: '', complement: '', description: '', coordinates: null, zone: 'POLICE', status: 'RESOLVED',
  outcome: 'PACIFIE', assignedUnits: ['u1'], logs: [], createdTimestamp: 0,
  pending: null, eventCount: 0, firstArrivalAt: 2 * MIN, neglected: false, ...over,
});

describe('sous-évaluation', () => {
  it('compte les niveaux manquants, jamais négatif', () => {
    expect(underRating(incident({ gravity: 1, trueCategory: 'vol avec violences' }))).toBe(2);
    expect(underRating(incident({ gravity: 5, trueCategory: 'vol avec violences' }))).toBe(0);
    expect(underRating(incident({ gravity: 1 }))).toBe(0); // vérité inconnue
    expect(underRating(incident({ gravity: 1, trueCategory: 'catégorie inconnue' }))).toBe(0);
  });
});

describe('effectifs', () => {
  it('unités manquantes : fiche résolue seulement, pas pour un simple renseignement', () => {
    expect(missingUnits(incident({ requiredUnits: 3, assignedUnits: ['u1'] }))).toBe(2);
    expect(missingUnits(incident({ requiredUnits: 3, assignedUnits: ['u1'], status: 'FAILED' }))).toBe(0);
    expect(missingUnits(incident({ requiredUnits: 3, assignedUnits: [], gravity: 1 }))).toBe(0);
    expect(missingUnits(incident({ assignedUnits: [] }))).toBe(0); // besoin inconnu
  });

  it('unités en trop : chaque aléa en justifie une', () => {
    expect(surplusUnits(incident({ requiredUnits: 1, assignedUnits: ['a', 'b', 'c'] }))).toBe(2);
    expect(surplusUnits(incident({ requiredUnits: 1, assignedUnits: ['a', 'b', 'c'], eventCount: 2 }))).toBe(0);
    expect(surplusUnits(incident({ assignedUnits: ['a', 'b'] }))).toBe(0);
  });
});

describe('bilan', () => {
  it("délai moyen et part d'arrivées dans le délai cible", () => {
    const r = buildReport([
      incident({ id: 'A', firstArrivalAt: 4 * MIN }), // cible 5 min : à l'heure
      incident({ id: 'B', firstArrivalAt: 8 * MIN }), // en retard
      incident({ id: 'C', status: 'PENDING', outcome: null, firstArrivalAt: null }), // ni arrivée ni échec : ignorée
    ]);
    expect(r).toMatchObject({ total: 3, open: 1, resolved: 2, failed: 0 });
    expect(r.avgResponseMin).toBeCloseTo(6);
    expect(r.onTimePct).toBeCloseTo(50);
  });

  it('un échec sans arrivée est un délai manqué ; un appel abandonné pèse 0 en satisfaction', () => {
    const r = buildReport([incident({ status: 'FAILED', outcome: 'FUITE', firstArrivalAt: null })], 1);
    expect(r.onTimePct).toBe(0);
    expect(r.avgResponseMin).toBeNull();
    expect(r.outcomes.FUITE).toBe(1);
    expect(r.abandoned).toBe(1);
    expect(r.satisfaction).toBe(0);
  });

  it('simple renseignement : pas de délai cible', () => {
    expect(buildReport([incident({ gravity: 1 })]).onTimePct).toBeNull();
  });
});
