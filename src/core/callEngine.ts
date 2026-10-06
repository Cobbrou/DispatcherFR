import { categoryByLabel } from '../data/categories';
import { geocode } from '../lib/geocode';
import type {
  ActiveCall,
  GravityLevel,
  Incident,
  IncidentDraft,
  IncomingCall,
  ServiceType,
} from '../types';
import type { CallerReply } from './callerEngine';

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export const emptyDraft = (): IncidentDraft => ({
  category: '',
  gravity: null,
  callerLastName: '',
  callerFirstName: '',
  callerPhone: '',
  address: '',
  complement: '',
  description: '',
});

export function startCall(call: IncomingCall, opening: string): ActiveCall {
  // Numéro affiché (non masqué) → prérempli dans la fiche, modifiable.
  const shownPhone = call.callerPhoneNumber === call.truth.callerPhone ? call.truth.callerPhone : '';
  return {
    call,
    transcript: [{ from: 'APPELANT', text: opening }],
    stress: call.callerStressLevel,
    topics: {},
    pending: false,
    endReason: null,
    draft: { ...emptyDraft(), callerPhone: shownPhone },
  };
}

export function operatorSays(active: ActiveCall, text: string): ActiveCall {
  return { ...active, pending: true, transcript: [...active.transcript, { from: 'OPERATEUR', text }] };
}

export function applyReply(active: ActiveCall, reply: CallerReply): ActiveCall {
  const stress = clamp(active.stress + reply.stressDelta);
  const topics = { ...active.topics };
  for (const t of reply.topics) topics[t] = (topics[t] ?? 0) + 1;
  const transcript = [...active.transcript, { from: 'APPELANT' as const, text: reply.text }];

  if (stress >= 100)
    return {
      ...active, stress, topics, pending: false, endReason: 'RACCROCHE',
      transcript: [...transcript, { from: 'SYSTEME', text: "L'appelant a raccroché." }],
    };
  return { ...active, stress, topics, transcript, pending: false, endReason: reply.end };
}

export function hangUp(active: ActiveCall): ActiveCall {
  if (active.endReason) return active;
  return {
    ...active, pending: false, endReason: 'OPERATEUR',
    transcript: [...active.transcript, { from: 'SYSTEME', text: 'Appel terminé.' }],
  };
}

/** Modifie la fiche. La gravité découle toujours de la catégorie du glossaire (null si inconnue). */
export function patchDraft(active: ActiveCall, patch: Partial<IncidentDraft>): ActiveCall {
  const gravity = patch.category === undefined ? {} : { gravity: categoryByLabel.get(patch.category)?.level ?? null };
  return { ...active, draft: { ...active.draft, ...patch, ...gravity } };
}

/** Valide : catégorie du glossaire (donc gravité) et adresse non vide. */
export function isDraftValid(d: IncidentDraft): d is IncidentDraft & { gravity: GravityLevel } {
  return categoryByLabel.has(d.category) && d.gravity !== null && d.address.trim() !== '';
}

export function nextIncidentId(existingIds: string[], now: number): string {
  const year = new Date(now).getUTCFullYear();
  const max = existingIds.reduce((m, id) => Math.max(m, Number(id.split('-')[2]) || 0), 0);
  return `FICH-${year}-${String(max + 1).padStart(4, '0')}`;
}

/** Fiche validée → entrée de main courante (statut PENDING). Tout vient de la saisie de l'opérateur. */
export function buildIncident(draft: IncidentDraft, id: string, now: number, service: ServiceType): Incident {
  if (!isDraftValid(draft)) throw new Error('Fiche incomplète');
  const geo = geocode(draft.address);
  return {
    ...draft,
    callerLastName: draft.callerLastName.trim(),
    callerFirstName: draft.callerFirstName.trim(),
    callerPhone: draft.callerPhone.trim(),
    address: draft.address.trim(),
    id,
    coordinates: geo?.coordinates ?? null,
    zone: geo?.zone ?? service,
    status: 'PENDING',
    outcome: null,
    assignedUnits: [],
    logs: [
      { timestamp: now, author: 'SYSTEME', message: 'Appel reçu' },
      { timestamp: now, author: 'OPERATEUR_1', message: `Fiche validée : ${draft.category}` },
    ],
    createdTimestamp: now,
  };
}
