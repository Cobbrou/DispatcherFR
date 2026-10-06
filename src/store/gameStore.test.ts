import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callerEngine } from '../core/callerEngine';
import { initialGameState } from '../data/mock';
import { geocodeBan } from '../lib/ban';
import { fetchRoute, straightRoute } from '../lib/route';
import { useGameStore } from './gameStore';

vi.mock('../lib/ban', () => ({ geocodeBan: vi.fn() }));
vi.mock('../lib/route', async (orig) => ({ ...(await orig<typeof import('../lib/route')>()), fetchRoute: vi.fn() }));

const EXACT = { lat: 49.1, lng: 2.1 };
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Décroche le premier appel et remplit une fiche valide. */
function fillCall() {
  const s = useGameStore.getState();
  s.answerCall(s.callQueue[0].id);
  s.updateDraft({ category: 'tapage', address: '12 rue Pasteur, Louvres' });
}

beforeEach(() => {
  vi.resetAllMocks();
  useGameStore.setState({ ...initialGameState, activeCall: null });
});

describe('validateCall', () => {
  it("remplace la position approchée par l'adresse exacte de la BAN", async () => {
    vi.mocked(geocodeBan).mockResolvedValue(EXACT);
    fillCall();
    useGameStore.getState().validateCall();
    const id = useGameStore.getState().selectedIncidentId!;
    expect(useGameStore.getState().incidents[id].coordinates).not.toEqual(EXACT);
    await flush();
    expect(useGameStore.getState().incidents[id].coordinates).toEqual(EXACT);
  });

  it('ne touche pas à une fiche placée à la main entre-temps', async () => {
    vi.mocked(geocodeBan).mockResolvedValue(EXACT);
    fillCall();
    useGameStore.getState().validateCall();
    const id = useGameStore.getState().selectedIncidentId!;
    const manual = { lat: 49.0, lng: 2.0 };
    useGameStore.getState().placeIncident(id, manual);
    await flush();
    expect(useGameStore.getState().incidents[id].coordinates).toEqual(manual);
  });

  it('ne déplace pas une fiche dont une unité est déjà en route', async () => {
    vi.mocked(geocodeBan).mockResolvedValue(EXACT);
    vi.mocked(fetchRoute).mockResolvedValue(straightRoute({ lat: 49, lng: 2 }, { lat: 49.01, lng: 2.01 }));
    fillCall();
    useGameStore.getState().validateCall();
    const s = useGameStore.getState();
    const id = s.selectedIncidentId!;
    const unit = Object.values(s.units).find((u) => u.status === 'DISPO_POSTE')!;
    const before = s.incidents[id].coordinates;
    s.assignUnit(unit.id, id);
    await flush();
    expect(useGameStore.getState().incidents[id].coordinates).toEqual(before);
  });
});

describe('assignUnit : itinéraire', () => {
  it('signale au journal un repli en ligne droite', async () => {
    const route = { ...straightRoute({ lat: 49, lng: 2 }, { lat: 49.01, lng: 2.01 }), estimated: true };
    vi.mocked(fetchRoute).mockResolvedValue(route);
    const s = useGameStore.getState();
    const unit = Object.values(s.units).find((u) => u.status === 'DISPO_POSTE')!;
    s.assignUnit(unit.id, 'FICH-2026-0043');
    await flush();
    const st = useGameStore.getState();
    expect(st.units[unit.id].route).toBe(route);
    expect(st.radio.at(-1)?.text).toContain('itinéraire estimé');
  });
});

describe('sélection', () => {
  it("sélectionner une unité engagée sélectionne aussi sa fiche ; sélectionner une fiche libère l'unité", () => {
    const s = useGameStore.getState();
    const unit = Object.values(s.units).find((u) => u.assignedIncidentId === 'FICH-2026-0046')!;
    s.selectIncident('FICH-2026-0043');
    s.selectUnit(unit.id);
    expect(useGameStore.getState()).toMatchObject({ selectedUnitId: unit.id, selectedIncidentId: 'FICH-2026-0046' });
    s.selectIncident('FICH-2026-0043');
    expect(useGameStore.getState().selectedUnitId).toBeNull();
  });
});

describe('services hors-ligne', () => {
  it('signale une BAN injoignable, puis son retour', async () => {
    vi.mocked(geocodeBan).mockRejectedValueOnce(new Error('BAN 503'));
    fillCall();
    useGameStore.getState().validateCall();
    await flush();
    expect(useGameStore.getState().offline.ban).toBe(true);
    vi.mocked(geocodeBan).mockResolvedValueOnce(null); // adresse introuvable : le service répond
    fillCall();
    useGameStore.getState().validateCall();
    await flush();
    expect(useGameStore.getState().offline.ban).toBe(false);
  });

  it('signale un itinéraire estimé, puis son retour', async () => {
    const ok = straightRoute({ lat: 49, lng: 2 }, { lat: 49.01, lng: 2.01 });
    vi.mocked(fetchRoute).mockResolvedValueOnce({ ...ok, estimated: true }).mockResolvedValueOnce(ok);
    const units = Object.values(useGameStore.getState().units).filter((u) => u.status === 'DISPO_POSTE');
    useGameStore.getState().assignUnit(units[0].id, 'FICH-2026-0043');
    await flush();
    expect(useGameStore.getState().offline.route).toBe(true);
    useGameStore.getState().assignUnit(units[1].id, 'FICH-2026-0043');
    await flush();
    expect(useGameStore.getState().offline.route).toBe(false);
  });
});

describe('say', () => {
  it("rend la saisie si le moteur de l'appelant échoue", async () => {
    vi.spyOn(callerEngine, 'reply').mockRejectedValue(new Error('LLM indisponible'));
    fillCall();
    await useGameStore.getState().say('Quelle est votre adresse ?');
    expect(useGameStore.getState().activeCall?.pending).toBe(false);
  });
});

describe('tick', () => {
  it("avance en ×1 tant qu'un appel attend, à la vitesse choisie sinon", () => {
    useGameStore.setState({ timeScale: 30 });
    const t0 = useGameStore.getState().now;
    useGameStore.getState().tick(1000); // 3 appels en file : ×1
    expect(useGameStore.getState().now).toBe(t0 + 1000);
    useGameStore.setState({ callQueue: [], nextCallAt: Infinity });
    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().now).toBe(t0 + 1000 + 30_000);
  });

  it('ne fait rien en pause', () => {
    useGameStore.setState({ paused: true });
    const now = useGameStore.getState().now;
    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().now).toBe(now);
  });
});
