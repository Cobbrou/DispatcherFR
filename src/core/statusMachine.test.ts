import { describe, expect, it } from 'vitest';
import type { IncidentStatus, UnitStatus } from '../types';
import { canIncident, canUnit } from './statusMachine';

const UNIT_STATUSES: UnitStatus[] = ['DISPO_ON_ZONE', 'DISPO_POSTE', 'EN_ROUTE', 'SUR_LES_LIEUX', 'EN_TRANSPORT', 'INDISPONIBLE'];
const INCIDENT_STATUSES: IncidentStatus[] = ['PENDING', 'DISPATCHED', 'ON_SCENE', 'RESOLVED', 'FAILED'];

describe('machine à états', () => {
  it("une unité libre peut être engagée, une unité en route non", () => {
    expect(canUnit('DISPO_ON_ZONE', 'EN_ROUTE')).toBe(true);
    expect(canUnit('DISPO_POSTE', 'EN_ROUTE')).toBe(true);
    expect(canUnit('EN_ROUTE', 'EN_ROUTE')).toBe(false);
    expect(canUnit('SUR_LES_LIEUX', 'EN_ROUTE')).toBe(false);
    expect(canUnit('INDISPONIBLE', 'EN_ROUTE')).toBe(false);
  });

  it("seule une unité libre peut passer indisponible, et elle ne reprend qu'en service", () => {
    for (const s of UNIT_STATUSES) expect(canUnit(s, 'INDISPONIBLE')).toBe(s === 'DISPO_ON_ZONE' || s === 'DISPO_POSTE');
    expect(canUnit('INDISPONIBLE', 'DISPO_POSTE')).toBe(true);
    expect(canUnit('INDISPONIBLE', 'DISPO_ON_ZONE')).toBe(true);
    expect(canUnit('INDISPONIBLE', 'EN_ROUTE')).toBe(false);
  });

  it('aucune unité ne reste dans son statut', () => {
    for (const s of UNIT_STATUSES) expect(canUnit(s, s)).toBe(false);
  });

  it('une fiche close est terminale', () => {
    for (const s of INCIDENT_STATUSES) {
      expect(canIncident('RESOLVED', s)).toBe(false);
      expect(canIncident('FAILED', s)).toBe(false);
    }
    expect(canIncident('PENDING', 'DISPATCHED')).toBe(true);
    expect(canIncident('PENDING', 'ON_SCENE')).toBe(false);
    expect(canIncident('ON_SCENE', 'RESOLVED')).toBe(true);
  });
});
