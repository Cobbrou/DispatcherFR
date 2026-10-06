import type { IncidentStatus, UnitStatus } from '../types';

// Voir docs/statuses.md §1 et §2.
const UNIT: Record<UnitStatus, UnitStatus[]> = {
  DISPO_ON_ZONE: ['EN_ROUTE', 'INDISPONIBLE', 'URGENCE_RADIO'],
  DISPO_POSTE: ['EN_ROUTE', 'INDISPONIBLE', 'URGENCE_RADIO'],
  EN_ROUTE: ['SUR_LES_LIEUX', 'DISPO_ON_ZONE', 'URGENCE_RADIO'],
  SUR_LES_LIEUX: ['EN_TRANSPORT', 'DISPO_ON_ZONE', 'URGENCE_RADIO'],
  EN_TRANSPORT: ['DISPO_POSTE', 'URGENCE_RADIO'],
  INDISPONIBLE: ['DISPO_POSTE', 'URGENCE_RADIO'],
  URGENCE_RADIO: ['SUR_LES_LIEUX', 'DISPO_ON_ZONE'],
};

const INCIDENT: Record<IncidentStatus, IncidentStatus[]> = {
  PENDING: ['DISPATCHED', 'RESOLVED', 'FAILED'],
  DISPATCHED: ['ON_SCENE', 'PENDING', 'FAILED'],
  ON_SCENE: ['RESOLVED', 'FAILED', 'DISPATCHED'],
  RESOLVED: [],
  FAILED: [],
};

export const canUnit = (from: UnitStatus, to: UnitStatus) => UNIT[from].includes(to);
export const canIncident = (from: IncidentStatus, to: IncidentStatus) => INCIDENT[from].includes(to);
