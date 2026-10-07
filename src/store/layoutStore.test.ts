import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pas de navigateur ici : un localStorage vide suffit à la persistance.
vi.hoisted(() => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage;
});

import { useLayoutStore } from './layoutStore';

beforeEach(() => useLayoutStore.getState().reset());

describe('disposition', () => {
  it('masque puis réaffiche un panneau', () => {
    const { toggle } = useLayoutStore.getState();
    toggle('radio');
    expect(useLayoutStore.getState().hidden).toEqual(['radio']);
    toggle('radio');
    expect(useLayoutStore.getState().hidden).toEqual([]);
  });

  it('redimensionne sans toucher au reste ; reset rend la disposition par défaut', () => {
    const { resize, toggle, reset } = useLayoutStore.getState();
    resize({ left: 400, radio: 220 });
    toggle('units');
    expect(useLayoutStore.getState()).toMatchObject({ left: 400, right: null, radio: 220, hidden: ['units'] });
    reset();
    expect(useLayoutStore.getState()).toMatchObject({ left: null, radio: 160, hidden: [] });
  });
});
