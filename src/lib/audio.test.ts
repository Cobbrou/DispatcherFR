import { describe, expect, it } from 'vitest';
import type { RadioMessage } from '../types';
import { soundFor } from './audio';

const msg = (id: string, urgent = false): RadioMessage => ({ id, timestamp: 0, from: 'A', to: 'B', text: '', urgent });
const state = (calls: number, radio: RadioMessage[] = []) => ({ callQueue: Array(calls).fill(null), radio });

describe('soundFor', () => {
  it('un nouvel appel dans la file fait sonner, même avec un message radio en même temps', () => {
    expect(soundFor(state(0), state(1))).toBe('ring');
    expect(soundFor(state(0), state(1, [msg('1')]))).toBe('ring');
  });

  it('un appel qui quitte la file ne fait rien', () => {
    expect(soundFor(state(2), state(1))).toBeNull();
  });

  it("un message radio grésille, un message urgent alerte, seul le dernier compte", () => {
    expect(soundFor(state(0), state(0, [msg('1')]))).toBe('squelch');
    expect(soundFor(state(0, [msg('1')]), state(0, [msg('1'), msg('2', true)]))).toBe('alert');
    expect(soundFor(state(0, [msg('1')]), state(0, [msg('1'), msg('2', true), msg('3')]))).toBe('squelch');
  });

  it('rien de nouveau : silence', () => {
    expect(soundFor(state(1, [msg('1')]), state(1, [msg('1')]))).toBeNull();
    expect(soundFor(state(0), state(0))).toBeNull();
  });
});
