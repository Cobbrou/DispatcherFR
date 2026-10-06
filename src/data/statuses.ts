import type { GravityLevel, IncidentStatus, UnitStatus } from '../types';

export const UNIT_STATUS_META: Record<UnitStatus, { code: string; label: string; badge: string }> = {
  DISPO_ON_ZONE: { code: '10-0', label: 'Dispo secteur', badge: 'bg-emerald-600 text-white' },
  DISPO_POSTE: { code: '10-1', label: 'Dispo poste', badge: 'bg-emerald-300 text-emerald-950' },
  EN_ROUTE: { code: '10-2', label: 'En route', badge: 'bg-orange-500 text-white' },
  SUR_LES_LIEUX: { code: '10-3', label: 'Sur les lieux', badge: 'bg-red-600 text-white' },
  EN_TRANSPORT: { code: '10-4', label: 'En transport', badge: 'bg-violet-600 text-white' },
  INDISPONIBLE: { code: '10-5', label: 'Indisponible', badge: 'bg-slate-600 text-slate-100' },
  URGENCE_RADIO: { code: 'URG', label: 'Urgence radio', badge: 'bg-red-700 text-white animate-pulse' },
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
  4: { label: 'Urgent', badge: 'bg-orange-500 text-white' },
  3: { label: 'Normal', badge: 'bg-yellow-400 text-yellow-950' },
  2: { label: 'Différé', badge: 'bg-sky-500 text-white' },
  1: { label: 'Info', badge: 'bg-slate-500 text-white' },
};
