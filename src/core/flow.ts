import { salleOf } from '../data/radio';
import type { Rng } from '../lib/rng';
import type { GameState } from '../types';
import { radio } from './dispatch';
import { generateCall } from './scenarioGenerator';

const MIN = 60_000;
/** Intervalle moyen entre deux appels (minutes simulées) à vide et à `timeScale` 1. */
export const CALL_BASE_MIN = 2;
/** Surcharge de l'intervalle par fiche ouverte. */
const PER_OPEN = 0.15;
/** Attente maximale d'un appel en file avant que l'appelant raccroche (minutes simulées). */
export const CALL_ABANDON_MIN = 10;

/**
 * Délai avant le prochain appel : loi exponentielle (appels indépendants), plus long quand la salle est chargée.
 * ponytail: en √timeScale, pour qu'à ×30 le joueur ne soit pas noyé ; courbe à ajuster au jeu.
 */
export function nextCallDelayMs(rng: Rng, openIncidents: number, timeScale: number): number {
  const mean = CALL_BASE_MIN * (1 + PER_OPEN * openIncidents) * Math.sqrt(timeScale);
  return Math.max(0.5 * MIN, -Math.log(1 - rng()) * mean * MIN);
}

/** Arrivée automatique des appels et abandon de ceux restés trop longtemps en file. */
export function flowCalls<S extends GameState>(s: S, rng: Rng = Math.random): S {
  let next = s;

  const lost = next.callQueue.filter((c) => next.now - c.receivedAt >= CALL_ABANDON_MIN * MIN);
  if (lost.length) {
    next = { ...next, callQueue: next.callQueue.filter((c) => !lost.includes(c)), abandonedCalls: next.abandonedCalls + lost.length };
    for (const c of lost)
      next = radio(next, 'SYSTEME', salleOf(next.service), `Appel de ${c.callerPhoneNumber} abandonné : l'appelant a raccroché après ${CALL_ABANDON_MIN} min d'attente.`, true);
  }

  if (next.now >= next.nextCallAt) {
    const open = Object.values(next.incidents).filter((i) => i.status !== 'RESOLVED' && i.status !== 'FAILED').length;
    next = {
      ...next,
      callQueue: [...next.callQueue, generateCall(rng, next.service, next.now)],
      nextCallAt: next.now + nextCallDelayMs(rng, open, next.timeScale),
    };
  }
  return next;
}
