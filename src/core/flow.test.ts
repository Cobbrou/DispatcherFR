import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/rng';
import { initialGameState } from '../data/mock';
import type { GameState } from '../types';
import { CALL_ABANDON_MIN, flowCalls, nextCallDelayMs } from './flow';

const MIN = 60_000;
const base = (over: Partial<GameState> = {}): GameState => ({ ...initialGameState, callQueue: [], radio: [], ...over });

describe('flux d\'appels', () => {
  it('ajoute un appel à l\'échéance puis reprogramme le suivant', () => {
    const s = base({ nextCallAt: initialGameState.now + MIN });
    expect(flowCalls({ ...s, now: s.now + MIN - 1 }, mulberry32(1)).callQueue).toHaveLength(0);
    const w = flowCalls({ ...s, now: s.now + MIN }, mulberry32(1));
    expect(w.callQueue).toHaveLength(1);
    expect(w.callQueue[0].receivedAt).toBe(s.now + MIN);
    expect(w.nextCallAt).toBeGreaterThan(w.now);
  });

  it('espace davantage les appels quand la salle est chargée ou le temps accéléré', () => {
    const mean = (open: number, scale: number) =>
      Array.from({ length: 500 }, (_, i) => nextCallDelayMs(mulberry32(i + 1), open, scale)).reduce((a, b) => a + b) / 500;
    expect(mean(10, 10)).toBeGreaterThan(mean(0, 10));
    expect(mean(0, 30)).toBeGreaterThan(mean(0, 1));
  });

  it('abandonne l\'appel resté trop longtemps en file, avec un message radio', () => {
    const [a, b] = initialGameState.callQueue;
    const s = base({ callQueue: [{ ...a, receivedAt: 0 }, { ...b, receivedAt: 9 * MIN }], now: CALL_ABANDON_MIN * MIN, nextCallAt: Infinity });
    const w = flowCalls(s);
    expect(w.callQueue).toEqual([{ ...b, receivedAt: 9 * MIN }]);
    expect(w.abandonedCalls).toBe(1);
    expect(w.radio.at(-1)).toMatchObject({ from: 'SYSTEME', urgent: true });
  });
});
