import { emptyDraft } from '../core/callEngine';
import { generateCall } from '../core/scenarioGenerator';
import { straightRoute } from '../lib/route';
import type { GameState, Incident, IncidentDetails, Unit } from '../types';

// ponytail: unités et fiches factices de départ ; un vrai seed (secteurs, effectifs) viendra avec les journées de service
const NOW = Date.parse('2026-10-06T14:32:00Z');
const MIN = 60_000;
const at = (minAgo: number) => NOW - minAgo * MIN;

const unit = (
  id: string,
  callsign: string,
  service: Unit['service'],
  type: Unit['type'],
  status: Unit['status'],
  officersCount: number,
  equipment: string[],
  position: Unit['position'],
  assignedIncidentId: string | null = null,
  onSceneUntil: number | null = null,
): Unit => ({
  id, callsign, service, type, status, officersCount, equipment, assignedIncidentId,
  position,
  onSceneUntil,
  route: null,
  routeElapsedMs: 0,
  sectorId: service === 'POLICE' ? 'csp-melun' : 'cob-dammarie',
});

// Positions de départ : autour du commissariat de Melun (police) et de Dammarie-lès-Lys (gendarmerie).
const units: Unit[] = [
  unit('u1', 'PAM 1', 'POLICE', 'PAM', 'SUR_LES_LIEUX', 3, ['TASER', 'LBD40'], { lat: 48.5405, lng: 2.6602 }, 'FICH-2026-0042', NOW + 12 * MIN),
  unit('u2', 'PAM 2', 'POLICE', 'PAM', 'DISPO_ON_ZONE', 2, ['TASER'], { lat: 48.5445, lng: 2.654 }),
  unit('u3', 'PAM 3', 'POLICE', 'PAM', 'EN_ROUTE', 2, ['TASER'], { lat: 48.5385, lng: 2.6565 }, 'FICH-2026-0042'),
  unit('u4', 'BAC 75', 'POLICE', 'BAC', 'DISPO_ON_ZONE', 3, ['TASER', 'LBD40', 'BOUCLIER_BALISTIQUE'], { lat: 48.5337, lng: 2.6692 }),
  unit('u5', 'BST 1', 'POLICE', 'BST', 'DISPO_POSTE', 3, ['TASER', 'LBD40'], { lat: 48.5412, lng: 2.6585 }),
  unit('u6', 'FM 1', 'POLICE', 'MOTOCYCLISTES', 'EN_TRANSPORT', 2, ['TASER'], { lat: 48.5399, lng: 2.659 }),
  unit('u7', 'CYNO 1', 'POLICE', 'CANINE', 'INDISPONIBLE', 2, ['TASER'], { lat: 48.5412, lng: 2.6585 }),
  unit('u8', 'PSIG MELUN 1', 'GENDARMERIE', 'PSIG', 'DISPO_ON_ZONE', 3, ['LBD40', 'HERSE'], { lat: 48.5148, lng: 2.641 }),
  unit('u9', 'BTA DAMMARIE 1', 'GENDARMERIE', 'BTA', 'DISPO_POSTE', 2, ['TASER'], { lat: 48.5123, lng: 2.639 }),
  unit('u10', 'BMO 1', 'GENDARMERIE', 'BMO', 'EN_ROUTE', 2, ['HERSE'], { lat: 48.5135, lng: 2.6395 }, 'FICH-2026-0046'),
];

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
    category: 'vol avec violences', gravity: 5, zone: 'POLICE', status: 'ON_SCENE',
    address: '12 rue Saint-Barthélemy, Melun', coordinates: { lat: 48.5405, lng: 2.6602 },
    callerLastName: 'Moreau', callerFirstName: 'Camille', callerPhone: '06 12 34 56 78',
    description: "Sac arraché, requérante frappée au visage. Auteur armé d'un couteau.",
    assignedUnits: ['u1', 'u3'], minAgo: 9, firstArrivalAt: at(3),
    logs: [
      [9, 'SYSTEME', 'Appel reçu'],
      [8, 'OPERATEUR_1', 'Fiche validée : vol avec violences'],
      [7, 'OPERATEUR_1', 'PAM 1 engagé'],
      [3, 'PAM 1', 'De PAM 1 pour salle, arrivés sur les lieux'],
      [2, 'PAM 1', 'Message urgent : 3 individus supplémentaires, demandons renfort'],
    ],
  }),
  inc(43, {
    category: 'différend violences conjugales', gravity: 4, zone: 'POLICE', status: 'PENDING',
    address: '5 avenue Thiers, Melun', coordinates: { lat: 48.5368, lng: 2.6571 },
    description: 'Cris et bruits de coups entendus par une voisine.',
    assignedUnits: [], minAgo: 4,
    logs: [[4, 'SYSTEME', 'Appel reçu'], [3, 'OPERATEUR_1', 'Fiche validée : différend violences conjugales']],
  }),
  inc(44, {
    category: 'tapage', gravity: 2, zone: 'POLICE', status: 'PENDING',
    address: '27 rue du Château, Melun', coordinates: { lat: 48.5391, lng: 2.6644 },
    description: 'Musique à fond depuis 22h.', assignedUnits: [], minAgo: 15,
    logs: [[15, 'SYSTEME', 'Appel reçu']],
  }),
  inc(45, {
    category: 'demande renseignement', gravity: 1, zone: 'POLICE', status: 'PENDING',
    address: 'Commissariat de Melun', coordinates: { lat: 48.5412, lng: 2.6585 },
    description: 'Demande de renseignement sur le dépôt de plainte.', assignedUnits: [], minAgo: 22,
    logs: [[22, 'SYSTEME', 'Appel reçu']],
  }),
  inc(46, {
    category: 'accident circulation corporel', gravity: 3, zone: 'GENDARMERIE', status: 'DISPATCHED',
    address: 'N36, Dammarie-lès-Lys', coordinates: { lat: 48.512, lng: 2.636 },
    description: 'Collision entre deux véhicules, un blessé léger.',
    assignedUnits: ['u10'], minAgo: 6,
    logs: [[6, 'SYSTEME', 'Appel reçu'], [5, 'OPERATEUR_1', 'BMO 1 engagé']],
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
  service: 'POLICE',
  units: Object.fromEntries(units.map((u) => [u.id, routed(u)])),
  incidents: Object.fromEntries(incidents.map((i) => [i.id, i])),
  callQueue: Array.from({ length: 3 }, () => generateCall(Math.random, 'POLICE')),
  activeCall: null,
  radio: [],
};
