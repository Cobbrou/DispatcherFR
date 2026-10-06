import type { GravityLevel, IncidentOutcome, IncidentStatus, UnitStatus, UnitType } from '../types';

export const UNIT_STATUS_META: Record<UnitStatus, { code: string; label: string; badge: string }> = {
  DISPO_ON_ZONE: { code: '10-0', label: 'Dispo secteur', badge: 'bg-emerald-700 text-white' },
  DISPO_POSTE: { code: '10-1', label: 'Dispo poste', badge: 'bg-emerald-300 text-emerald-950' },
  EN_ROUTE: { code: '10-2', label: 'En route', badge: 'bg-orange-700 text-white' },
  SUR_LES_LIEUX: { code: '10-3', label: 'Sur les lieux', badge: 'bg-red-600 text-white' },
  EN_TRANSPORT: { code: '10-4', label: 'En transport', badge: 'bg-violet-600 text-white' },
  INDISPONIBLE: { code: '10-5', label: 'Indisponible', badge: 'bg-slate-600 text-slate-100' },
  URGENCE_RADIO: { code: 'URG', label: 'Urgence radio', badge: 'bg-red-700 text-white animate-pulse' },
};

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  PAM: 'Police municipale', BAC: 'BAC', BST: 'BST', MOTOCYCLISTES: 'Motocyclistes', CANINE: 'Cynophile', OPJ: 'OPJ', BRI: 'BRI',
  BTA: 'Brigade territoriale', PSIG: 'PSIG', BMO: 'Brigade motorisée', GIGN: 'GIGN',
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  PENDING: 'En attente',
  DISPATCHED: 'Engagée',
  ON_SCENE: 'Sur place',
  RESOLVED: 'Résolue',
  FAILED: 'Échec',
};

export const GRAVITY_META: Record<GravityLevel, { label: string; badge: string }> = {
  5: { label: 'Critique', badge: 'bg-red-600 text-white' },
  4: { label: 'Urgent', badge: 'bg-orange-700 text-white' },
  3: { label: 'Normal', badge: 'bg-yellow-400 text-yellow-950' },
  2: { label: 'Différé', badge: 'bg-sky-700 text-white' },
  1: { label: 'Info', badge: 'bg-slate-500 text-white' },
};

export const OUTCOME_LABEL: Record<IncidentOutcome, string> = {
  INTERPELLE: 'Individu interpellé',
  PACIFIE: 'Situation pacifiée',
  FAUSSE_ALERTE: 'Fausse alerte',
  FUITE: 'Auteurs en fuite',
};

/** Délai cible d'arrivée sur les lieux et délai d'échec (minutes simulées), par gravité. Voir docs/statuses.md §3. */
export const RESPONSE_TARGET_MIN: Record<GravityLevel, number | null> = { 5: 5, 4: 10, 3: 20, 2: 60, 1: null };
export const FAIL_AFTER_MIN: Record<GravityLevel, number | null> = { 5: 15, 4: 30, 3: 60, 2: 180, 1: null };
