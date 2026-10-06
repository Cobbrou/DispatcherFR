import { create } from 'zustand';
import {
  applyReply,
  buildIncident,
  hangUp,
  isDraftValid,
  nextIncidentId,
  operatorSays,
  patchDraft,
  startCall,
} from '../core/callEngine';
import { callerEngine } from '../core/callerEngine';
import { assignUnit, closeIncident, radio, unassignUnit } from '../core/dispatch';
import { alertRescue } from '../core/events';
import { effectiveTimeScale, flowCalls } from '../core/flow';
import { tick } from '../core/tick';
import { geocodeBan } from '../lib/ban';
import { fetchRoute } from '../lib/route';
import { generateCall } from '../core/scenarioGenerator';
import { salleOf } from '../data/radio';
import { initialGameState } from '../data/mock';
import type { Coordinates, GameState, IncidentDraft } from '../types';

interface GameStore extends GameState {
  selectedIncidentId: string | null;
  selectedUnitId: string | null;
  /** Services externes en repli : tracé direct (OSRM) ou adresses non géolocalisées (BAN). */
  offline: { route: boolean; ban: boolean };
  selectIncident: (id: string | null) => void;
  /** Sélectionne une unité, et la fiche sur laquelle elle est engagée. */
  selectUnit: (id: string | null) => void;
  /** Ajoute un appel aléatoire à la file (bouton de test, hors production). */
  addIncomingCall: () => void;
  answerCall: (callId: string) => void;
  /** Texte libre de l'opérateur ; l'appelant répond via `callerEngine`. */
  say: (text: string) => Promise<void>;
  hangUp: () => void;
  updateDraft: (patch: Partial<IncidentDraft>) => void;
  /** Valide la fiche : elle entre en main courante. */
  validateCall: () => void;
  /** Jette la fiche en cours. */
  discardCall: () => void;
  /** Fait avancer le jeu ; `realDtMs` est du temps réel, multiplié par `timeScale`. */
  tick: (realDtMs: number) => void;
  togglePause: () => void;
  setTimeScale: (scale: number) => void;
  assignUnit: (unitId: string, incidentId: string) => void;
  unassignUnit: (unitId: string) => void;
  /** Place sur la carte une fiche dont l'adresse n'a pas été géolocalisée. */
  placeIncident: (id: string, coordinates: Coordinates) => void;
  closeIncident: (id: string) => void;
  /** Alerte le SAMU / les pompiers demandés par l'équipage sur place. */
  alertRescue: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,
  selectedIncidentId: Object.keys(initialGameState.incidents)[0] ?? null,
  selectedUnitId: null,
  offline: { route: false, ban: false },
  selectIncident: (id) => set({ selectedIncidentId: id, selectedUnitId: null }),
  selectUnit: (id) =>
    set((s) => ({ selectedUnitId: id, selectedIncidentId: (id && s.units[id]?.assignedIncidentId) || s.selectedIncidentId })),

  addIncomingCall: () =>
    set((s) => ({ callQueue: [...s.callQueue, generateCall(Math.random, s.service, s.now)] })),

  answerCall: (callId) =>
    set((s) => {
      const call = s.callQueue.find((c) => c.id === callId);
      if (s.activeCall || !call) return s;
      return {
        activeCall: startCall(call, callerEngine.opening(call)),
        callQueue: s.callQueue.filter((c) => c.id !== callId),
      };
    }),

  say: async (text) => {
    const active = get().activeCall;
    const message = text.trim();
    if (!active || active.pending || active.endReason || !message) return;
    set({ activeCall: operatorSays(active, message) });
    const reply = await callerEngine.reply(active, message).catch(() => null);
    // L'appel a pu être raccroché ou jeté pendant l'attente ; sans réponse (moteur en panne), la saisie est rendue.
    set((s) => {
      const cur = s.activeCall;
      if (cur?.call.id !== active.call.id || !cur.pending) return s;
      return { activeCall: reply ? applyReply(cur, reply) : { ...cur, pending: false } };
    });
  },

  hangUp: () => set((s) => (s.activeCall ? { activeCall: hangUp(s.activeCall) } : s)),

  updateDraft: (patch) => set((s) => (s.activeCall ? { activeCall: patchDraft(s.activeCall, patch) } : s)),

  validateCall: () => {
    const s = get();
    if (!s.activeCall || !isDraftValid(s.activeCall.draft)) return;
    const id = nextIncidentId(Object.keys(s.incidents), s.now);
    // Position approchée du gazetteer tout de suite, puis adresse exacte (rue + numéro) via la BAN.
    const incident = buildIncident(s.activeCall.draft, id, s.now, s.service, s.activeCall.call.truth);
    set({ incidents: { ...s.incidents, [id]: incident }, selectedIncidentId: id, activeCall: null });
    void geocodeBan(incident.address).then((exact) => {
      set((cur) => (cur.offline.ban ? { offline: { ...cur.offline, ban: false } } : cur));
      if (!exact) return;
      // Pas d'écrasement d'un placement manuel ni d'une position déjà utilisée par un trajet.
      set((cur) => {
        const i = cur.incidents[id];
        const untouched = i && i.assignedUnits.length === 0 && i.coordinates?.lat === incident.coordinates?.lat && i.coordinates?.lng === incident.coordinates?.lng;
        return untouched ? { incidents: { ...cur.incidents, [id]: { ...i, coordinates: exact } } } : cur;
      });
    }, () => set((cur) => ({ offline: { ...cur.offline, ban: true } })));
  },

  discardCall: () => set({ activeCall: null }),

  tick: (realDtMs) => set((s) => (s.paused ? s : flowCalls(tick(s, realDtMs * effectiveTimeScale(s))))),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setTimeScale: (timeScale) => set({ timeScale }),

  assignUnit: (unitId, incidentId) => {
    set((s) => assignUnit(s, unitId, incidentId));
    const { units, incidents } = get();
    const u = units[unitId];
    const target = incidents[incidentId]?.coordinates;
    if (u?.status !== 'EN_ROUTE' || u.assignedIncidentId !== incidentId || u.route || !target) return;
    // Itinéraire routier asynchrone : l'unité attend sa route avant de rouler (cf. tick).
    void fetchRoute(u.position, target).then((route) =>
      set((s) => {
        const cur = s.units[unitId];
        if (cur?.status !== 'EN_ROUTE' || cur.assignedIncidentId !== incidentId || cur.route) return s;
        // Le temps passé à attendre l'itinéraire compte comme roulage (cf. tick) : le joueur n'en pâtit pas.
        const next = { ...s, offline: { ...s.offline, route: !!route.estimated }, units: { ...s.units, [unitId]: { ...cur, route } } };
        // Repli en ligne droite : on le dit au joueur plutôt que de laisser l'unité sembler lente.
        return route.estimated
          ? radio(next, 'SYSTEME', salleOf(s.incidents[incidentId].zone), `${cur.callsign} : itinéraire estimé en ligne droite (cartographie injoignable).`)
          : next;
      }),
    );
  },
  unassignUnit: (unitId) => set((s) => unassignUnit(s, unitId)),
  placeIncident: (id, coordinates) =>
    set((s) => (s.incidents[id] ? { incidents: { ...s.incidents, [id]: { ...s.incidents[id], coordinates } } } : s)),
  closeIncident: (id) => set((s) => closeIncident(s, id, 'FAUSSE_ALERTE')),
  alertRescue: (id) => set((s) => alertRescue(s, id)),
}));
