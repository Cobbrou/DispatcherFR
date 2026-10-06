import { emptyDraft } from '../core/callEngine';
import { generateCall } from '../core/scenarioGenerator';
import { straightRoute } from '../lib/route';
import type { Coordinates, GameState, Incident, IncidentDetails, Unit } from '../types';
import { brigadeById, brigades, vehiclesOf } from './brigades';

// ponytail: fiches factices de départ ; un vrai seed (journées de service) viendra plus tard
const NOW = Date.parse('2026-10-06T14:32:00Z');
const MIN = 60_000;
const at = (minAgo: number) => NOW - minAgo * MIN;

/** Une patrouille par véhicule de chaque brigade (LOUVRES.101, LOUVRES.102…), stationnée à la brigade au départ. */
const units: Unit[] = brigades.flatMap((b) =>
  Array.from({ length: vehiclesOf(b) }, (_, i): Unit => ({
    id: `${b.id}-${101 + i}`,
    callsign: `${b.label}.${101 + i}`,
    service: 'GENDARMERIE',
    type: b.kind,
    status: 'DISPO_POSTE',
    officersCount: 2,
    equipment: b.kind === 'BMO' ? ['HERSE'] : ['LBD40'],
    assignedIncidentId: null,
    position: { lat: b.lat, lng: b.lng },
    onSceneUntil: null,
    route: null,
    routeElapsedMs: 0,
    sectorId: b.id,
  })),
);

/** Point à quelques centaines de mètres d'une brigade (positions des fiches factices). */
const near = (brigadeId: string, dLat = 0, dLng = 0): Coordinates => {
  const b = brigadeById.get(brigadeId)!;
  return { lat: b.lat + dLat, lng: b.lng + dLng };
};

// Situation de départ : une intervention en cours à Luzarches, un accident pris en charge par la BMO de Louvres.
const engage = (callsign: string, patch: Partial<Unit>) => Object.assign(units.find((u) => u.callsign === callsign)!, patch);
engage('LUZARCHES.101', { status: 'SUR_LES_LIEUX', assignedIncidentId: 'FICH-2026-0042', position: near('bta-95352', 0.0006, 0.0008), onSceneUntil: NOW + 12 * MIN });
engage('LUZARCHES.102', { status: 'EN_ROUTE', assignedIncidentId: 'FICH-2026-0042' });
engage('LOUVRES BMO.101', { status: 'EN_ROUTE', assignedIncidentId: 'FICH-2026-0046' });

type MockIncident = Partial<IncidentDetails> &
  Pick<IncidentDetails, 'category' | 'gravity' | 'address'> &
  Pick<Incident, 'coordinates' | 'zone' | 'status' | 'assignedUnits'> &
  Partial<Pick<Incident, 'firstArrivalAt'>> & {
    minAgo: number;
    logs: [number, string, string][];
  };

const inc = (n: number, p: MockIncident): Incident => {
  const { minAgo, logs, ...rest } = p;
  const blank = emptyDraft();
  return {
    ...blank,
    ...rest,
    id: `FICH-2026-${String(n).padStart(4, '0')}`,
    outcome: null,
    pending: null,
    eventCount: 0,
    firstArrivalAt: p.firstArrivalAt ?? null,
    neglected: false,
    createdTimestamp: at(minAgo),
    logs: logs.map(([m, author, message]) => ({ timestamp: at(m), author, message })),
  };
};

const incidents: Incident[] = [
  inc(42, {
    category: 'vol avec violences', gravity: 5, zone: 'GENDARMERIE', status: 'ON_SCENE',
    address: '12 rue du Général de Gaulle, Luzarches', coordinates: near('bta-95352', 0.0006, 0.0008),
    callerLastName: 'Moreau', callerFirstName: 'Camille', callerPhone: '06 12 34 56 78',
    description: "Sac arraché, requérante frappée au visage. Auteur armé d'un couteau.",
    assignedUnits: ['bta-95352-101', 'bta-95352-102'], minAgo: 9, firstArrivalAt: at(3),
    logs: [
      [9, 'SYSTEME', 'Appel reçu'],
      [8, 'OPERATEUR_1', 'Fiche validée : vol avec violences'],
      [7, 'OPERATEUR_1', 'LUZARCHES.101 engagé'],
      [3, 'LUZARCHES.101', 'De LUZARCHES.101 pour CORG, arrivés sur les lieux'],
      [2, 'LUZARCHES.101', 'Message urgent : 3 individus supplémentaires, demandons renfort'],
    ],
  }),
  inc(43, {
    category: 'différend violences conjugales', gravity: 4, zone: 'GENDARMERIE', status: 'PENDING',
    address: '5 avenue Jean Jaurès, Persan', coordinates: near('bta-95487', -0.0004, 0.0012),
    description: 'Cris et bruits de coups entendus par une voisine.',
    assignedUnits: [], minAgo: 4,
    logs: [[4, 'SYSTEME', 'Appel reçu'], [3, 'OPERATEUR_1', 'Fiche validée : différend violences conjugales']],
  }),
  inc(44, {
    category: 'tapage', gravity: 2, zone: 'GENDARMERIE', status: 'PENDING',
    address: '27 rue Pasteur, Domont', coordinates: near('bta-95199', 0.0015, -0.002),
    description: 'Musique à fond depuis 22h.', assignedUnits: [], minAgo: 15,
    logs: [[15, 'SYSTEME', 'Appel reçu']],
  }),
  inc(45, {
    category: 'demande renseignement', gravity: 1, zone: 'GENDARMERIE', status: 'PENDING',
    address: 'Brigade de gendarmerie, Écouen', coordinates: near('bta-95205'),
    description: 'Demande de renseignement sur le dépôt de plainte.', assignedUnits: [], minAgo: 22,
    logs: [[22, 'SYSTEME', 'Appel reçu']],
  }),
  inc(46, {
    category: 'accident circulation corporel', gravity: 3, zone: 'GENDARMERIE', status: 'DISPATCHED',
    address: 'route de la Grange aux Dîmes, Louvres', coordinates: near('bta-95351', 0.004, -0.003),
    description: 'Collision entre deux véhicules, un blessé léger.',
    assignedUnits: ['bmo-95351-101'], minAgo: 6,
    logs: [[6, 'SYSTEME', 'Appel reçu'], [5, 'OPERATEUR_1', 'LOUVRES BMO.101 engagé']],
  }),
];

// Unités déjà en route au départ : trajet direct (le calcul routier ne vaut que pour les engagements du joueur).
const routed = (u: Unit): Unit => {
  const target = u.status === 'EN_ROUTE' ? incidents.find((i) => i.id === u.assignedIncidentId)?.coordinates : null;
  return target ? { ...u, route: straightRoute(u.position, target) } : u;
};

export const initialGameState: GameState = {
  now: NOW,
  timeScale: 10,
  paused: false,
  service: 'GENDARMERIE',
  units: Object.fromEntries(units.map((u) => [u.id, routed(u)])),
  incidents: Object.fromEntries(incidents.map((i) => [i.id, i])),
  callQueue: Array.from({ length: 3 }, () => generateCall(Math.random, 'GENDARMERIE')),
  activeCall: null,
  radio: [],
};
