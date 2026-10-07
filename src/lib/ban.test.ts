import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocodeBan, suggestBan } from './ban';

const feature = (score: number, citycode: string | undefined, coordinates: [number, number]) => ({
  properties: { score, citycode }, geometry: { coordinates },
});
const reply = (features: unknown[], ok = true) => vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => ({ features }) });

afterEach(() => vi.unstubAllGlobals());

describe('suggestBan', () => {
  const hit = (name: string, city: string, citycode?: string) => ({ properties: { name, city, citycode } });

  it("propose « numéro rue, commune », limité au Val-d'Oise", async () => {
    const fetchMock = reply([hit('12 Rue Pasteur', 'Louvres', '95345'), hit('12 Rue Pasteur', 'Melun', '77288'), hit('Rue Pasteur', 'Gonesse', undefined)]);
    vi.stubGlobal('fetch', fetchMock);
    expect(await suggestBan('12 pasteur')).toEqual(['12 Rue Pasteur, Louvres']);
    expect(fetchMock.mock.calls[0][0]).toContain('autocomplete=1');
  });

  it('service en erreur : lève', async () => {
    vi.stubGlobal('fetch', reply([], false));
    await expect(suggestBan('x')).rejects.toThrow('BAN 503');
  });
});

describe('geocodeBan', () => {
  it("retourne le premier résultat fiable du Val-d'Oise (la BAN donne lng puis lat)", async () => {
    const fetchMock = reply([feature(0.4, '95500', [2.0, 49.0]), feature(0.9, '77288', [2.65, 48.54]), feature(0.8, '95277', [2.47, 49.0])]);
    vi.stubGlobal('fetch', fetchMock);
    expect(await geocodeBan('1 rue de Paris, Gonesse')).toEqual({ lat: 49.0, lng: 2.47 });
    expect(fetchMock.mock.calls[0][0]).toContain('q=1%20rue%20de%20Paris%2C%20Gonesse');
  });

  it('adresse introuvable, peu fiable ou hors 95 : null', async () => {
    vi.stubGlobal('fetch', reply([]));
    expect(await geocodeBan('nulle part')).toBeNull();
    vi.stubGlobal('fetch', reply([feature(0.3, '95277', [2.4, 49.0]), feature(0.9, undefined, [2.4, 49.0])]));
    expect(await geocodeBan('flou')).toBeNull();
  });

  it('service en erreur ou réseau coupé : lève, pour ne pas confondre avec « introuvable »', async () => {
    vi.stubGlobal('fetch', reply([], false));
    await expect(geocodeBan('x')).rejects.toThrow('BAN 503');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(geocodeBan('x')).rejects.toThrow('offline');
  });
});
