import type { IncidentStatus, UnitStatus } from '../types';

// Voir docs/statuses.md §1 et §2.
const UNIT: Record<UnitStatus, UnitStatus[]> = {
  DISPO_ON_ZONE: ['EN_ROUTE', 'INDISPONIBLE'],
  DISPO_POSTE: ['EN_ROUTE', 'INDISPONIBLE'],
  EN_ROUTE: ['SUR_LES_LIEUX', 'DISPO_ON_ZONE'],
  SUR_LES_LIEUX: ['EN_TRANSPORT', 'DISPO_ON_ZONE'],
  EN_TRANSPORT: ['DISPO_POSTE'],
  INDISPONIBLE: ['DISPO_POSTE', 'DISPO_ON_ZONE'], // reprise : l'unité est déjà au poste, ou regagne sa brigade
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
