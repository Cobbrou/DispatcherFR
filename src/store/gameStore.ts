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
import { assignUnit, closeIncident, unassignUnit } from '../core/dispatch';
import { alertRescue } from '../core/events';
import { tick } from '../core/tick';
import { geocodeBan } from '../lib/ban';
import { fetchRoute } from '../lib/route';
import { generateCall } from '../core/scenarioGenerator';
import { initialGameState } from '../data/mock';
import type { Coordinates, GameState, IncidentDraft } from '../types';

interface GameStore extends GameState {
  selectedIncidentId: string | null;
  selectIncident: (id: string | null) => void;
  /** Ajoute un appel aléatoire à la file (en attendant l'arrivée automatique des appels). */
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
  selectIncident: (id) => set({ selectedIncidentId: id }),

  addIncomingCall: () =>
    set((s) => ({ callQueue: [...s.callQueue, generateCall(Math.random, s.service)] })),

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
    const reply = await callerEngine.reply(active, message);
    // L'appel a pu être raccroché ou jeté pendant l'attente.
    set((s) => (s.activeCall?.call.id === active.call.id && s.activeCall.pending
      ? { activeCall: applyReply(s.activeCall, reply) }
      : s));
  },

  hangUp: () => set((s) => (s.activeCall ? { activeCall: hangUp(s.activeCall) } : s)),

  updateDraft: (patch) => set((s) => (s.activeCall ? { activeCall: patchDraft(s.activeCall, patch) } : s)),

  validateCall: () =>
    set((s) => {
      if (!s.activeCall || !isDraftValid(s.activeCall.draft)) return s;
      const id = nextIncidentId(Object.keys(s.incidents), s.now);
      // Position approchée du gazetteer tout de suite, puis adresse exacte (rue + numéro) via la BAN.
      void geocodeBan(s.activeCall.draft.address).then((c) => c && get().placeIncident(id, c));
      return {
        incidents: { ...s.incidents, [id]: buildIncident(s.activeCall.draft, id, s.now, s.service) },
        selectedIncidentId: id,
        activeCall: null,
      };
    }),

  discardCall: () => set({ activeCall: null }),

  tick: (realDtMs) => set((s) => (s.paused ? s : tick(s, realDtMs * s.timeScale))),
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
        return cur?.status === 'EN_ROUTE' && cur.assignedIncidentId === incidentId && !cur.route
          ? { units: { ...s.units, [unitId]: { ...cur, route, routeElapsedMs: 0 } } }
          : s;
      }),
    );
  },
  unassignUnit: (unitId) => set((s) => unassignUnit(s, unitId)),
  placeIncident: (id, coordinates) =>
    set((s) => (s.incidents[id] ? { incidents: { ...s.incidents, [id]: { ...s.incidents[id], coordinates } } } : s)),
  closeIncident: (id) => set((s) => closeIncident(s, id, 'FAUSSE_ALERTE')),
  alertRescue: (id) => set((s) => alertRescue(s, id)),
}));
