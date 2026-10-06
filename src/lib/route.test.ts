import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRoute, routeDurationMs } from './route';

const A = { lat: 49.0, lng: 2.0 };
const reply = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });
const osrm = (duration: unknown) => ({
  routes: [{ geometry: { coordinates: [[2.0, 49.0], [2.01, 49.0], [2.02, 49.0]] }, duration: 100, legs: [{ annotation: { duration } }] }],
});

afterEach(() => vi.unstubAllGlobals());

describe('fetchRoute', () => {
  it('route OSRM : durées par tronçon × 1,25, mémorisée', async () => {
    const fetchMock = reply(osrm([30, 50]));
    vi.stubGlobal('fetch', fetchMock);
    const to = { lat: 49.01, lng: 2.02 };
    const r = await fetchRoute(A, to);
    expect(r.estimated).toBeUndefined();
    expect(routeDurationMs(r)).toBeCloseTo((80 * 1000) / 1.25);
    await fetchRoute(A, to);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('réponse en erreur : repli en ligne droite signalé', async () => {
    vi.stubGlobal('fetch', reply({}, false));
    const r = await fetchRoute(A, { lat: 49.02, lng: 2.02 });
    expect(r.estimated).toBe(true);
    expect(r.points).toHaveLength(2);
  });

  it('durée invalide : jamais de NaN, repli', async () => {
    vi.stubGlobal('fetch', reply(osrm([null, null])));
    const r = await fetchRoute(A, { lat: 49.03, lng: 2.02 });
    expect(Number.isFinite(routeDurationMs(r))).toBe(true);
    expect(r.estimated).toBe(true);
  });

  it('réseau coupé : repli', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await fetchRoute(A, { lat: 49.04, lng: 2.02 })).estimated).toBe(true);
  });
});
