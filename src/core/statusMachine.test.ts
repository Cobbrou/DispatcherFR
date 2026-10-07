import { describe, expect, it } from 'vitest';
import type { IncidentStatus, UnitStatus } from '../types';
import { canIncident, canUnit } from './statusMachine';

const UNIT_STATUSES: UnitStatus[] = ['DISPO_ON_ZONE', 'DISPO_POSTE', 'EN_ROUTE', 'SUR_LES_LIEUX', 'EN_TRANSPORT', 'INDISPONIBLE', 'URGENCE_RADIO'];
const INCIDENT_STATUSES: IncidentStatus[] = ['PENDING', 'DISPATCHED', 'ON_SCENE', 'RESOLVED', 'FAILED'];

describe('machine à états', () => {
  it("une unité libre peut être engagée, une unité en route non", () => {
    expect(canUnit('DISPO_ON_ZONE', 'EN_ROUTE')).toBe(true);
    expect(canUnit('DISPO_POSTE', 'EN_ROUTE')).toBe(true);
    expect(canUnit('EN_ROUTE', 'EN_ROUTE')).toBe(false);
    expect(canUnit('SUR_LES_LIEUX', 'EN_ROUTE')).toBe(false);
    expect(canUnit('INDISPONIBLE', 'EN_ROUTE')).toBe(false);
  });

  it("l'urgence radio est accessible de partout sauf d'elle-même", () => {
    for (const s of UNIT_STATUSES) expect(canUnit(s, 'URGENCE_RADIO')).toBe(s !== 'URGENCE_RADIO');
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
