// ───────── Socle ─────────

export type ServiceType = 'POLICE' | 'GENDARMERIE';

export type UnitType =
  | 'PAM' | 'BAC' | 'BST' | 'MOTOCYCLISTES' | 'CANINE' | 'OPJ' | 'BRI' // Police
  | 'BTA' | 'PSIG' | 'BMO' | 'GIGN';                                    // Gendarmerie

export interface Coordinates {
  lat: number;
  lng: number;
}

// ───────── Unités ─────────

export type UnitStatus =
  | 'DISPO_ON_ZONE'   // 10-0
  | 'DISPO_POSTE'     // 10-1
  | 'EN_ROUTE'        // 10-2
  | 'SUR_LES_LIEUX'   // 10-3
  | 'EN_TRANSPORT'    // 10-4
  | 'INDISPONIBLE'    // 10-5
  | 'URGENCE_RADIO';  // AJOUT : présent en §2.3 du cahier des charges, absent de l'union §5

/** Itinéraire routier : tracé et temps de roulage cumulé (ms simulées) pour atteindre chaque point. */
export interface Route {
  points: Coordinates[];
  cumMs: number[];
  /** Repli en ligne droite : le service de cartographie était injoignable. */
  estimated?: boolean;
}

export interface Unit {
  id: string;
  callsign: string;           // "BAC 75", "PAM 1", "PSIG MELUN 1"
  service: ServiceType;
  type: UnitType;
  status: UnitStatus;
  position: Coordinates;
  assignedIncidentId: string | null;
  officersCount: number;
  equipment: string[];        // ["TASER", "LBD40", "HERSE", "BOUCLIER_BALISTIQUE"]
  sectorId: string;           // AJOUT : secteur d'affectation
  onSceneUntil: number | null; // AJOUT : fin de la temporisation sur place (ms simulées), null hors intervention
  route: Route | null;        // AJOUT : itinéraire suivi ; null hors trajet ou tant qu'il est calculé
  routeElapsedMs: number;     // AJOUT : temps de roulage écoulé sur `route`
}

// ───────── Catégories (glossaire officiel) ─────────

export type GravityLevel = 1 | 2 | 3 | 4 | 5; // 5 = grave, 1 = renseignement

/** Ligne du « Glossaire alphabétique ensemble catégories » (MAJ 01-2026). */
export interface Category {
  label: string;              // libellé catégorie, ex. "vol avec violences"
  level: GravityLevel;        // niveau du glossaire
  definition: string;         // définition de l'événement (peut être vide)
}

// ───────── Fiche d'intervention ─────────

export type IncidentStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'FAILED';

export type IncidentOutcome =
  | 'INTERPELLE'
  | 'FUITE'
  | 'FAUSSE_ALERTE'
  | 'PACIFIE';

export interface IncidentLog {
  timestamp: number;          // ms simulées
  author: string;             // "OPERATEUR_1", "PAM 1", "SYSTEME"
  message: string;
}

/** Contenu saisi par l'opérateur. Aucun champ n'est prérempli par le jeu. */
export interface IncidentDetails {
  category: string;           // libellé exact d'une `Category`
  gravity: GravityLevel;      // niveau de la catégorie du glossaire (non saisie)
  callerLastName: string;
  callerFirstName: string;
  callerPhone: string;
  address: string;            // texte libre
  complement: string;         // étage, bâtiment, repère
  description: string;        // faits
}

export type ConcoursService = 'SAMU' | 'pompiers' | 'routes';

/** Aléa en attente d'une réponse de l'opérateur : renfort à engager, secours à alerter. */
export interface PendingEvent {
  kind: 'RENFORT' | 'SECOURS';
  at: number;                 // ms simulées
  by: string;                 // indicatif de l'unité qui le demande
  service?: ConcoursService;  // SECOURS uniquement : service dont le concours est demandé
}

export interface Incident extends IncidentDetails {
  id: string;                         // "FICH-2026-0042"
  coordinates: Coordinates | null;    // géocodage de `address`, null si introuvable (à placer sur la carte)
  zone: ServiceType;                  // AJOUT : zone de compétence (ZPN / ZGN)
  status: IncidentStatus;
  outcome: IncidentOutcome | null;    // renseigné à la clôture
  assignedUnits: string[];            // Unit IDs
  logs: IncidentLog[];
  createdTimestamp: number;           // ms simulées
  pending: PendingEvent | null;       // AJOUT (étape 4) : aléa en attente de réponse
  eventCount: number;                 // AJOUT : aléas déjà survenus sur cette fiche
  firstArrivalAt: number | null;      // AJOUT : arrivée de la première unité (temps de réponse)
  neglected: boolean;                 // AJOUT : secours non alertés à temps
}

/** Fiche en cours de saisie pendant l'appel. */
export type IncidentDraft = Omit<IncidentDetails, 'gravity'> & {
  gravity: GravityLevel | null;       // dérivée de la catégorie ; null tant qu'elle n'est pas valide
};

// ───────── Appels ─────────

export type CallerPersonality = 'CALME' | 'PANIQUE' | 'EVASIF';

/** Vérité cachée d'un appel : générée au hasard, jamais montrée au joueur. */
export interface CallTruth {
  callerFirstName: string;
  callerLastName: string;
  callerPhone: string;                // numéro réel, même si l'appel arrive en « Numéro masqué »
  personality: CallerPersonality;
  category: string;                   // libellé de `Category` correspondant aux faits
  address: string;
  landmark: string;                   // repère visuel : "devant la pharmacie"
  coordinates: Coordinates;
  zone: ServiceType;
  opening: string;                    // premières paroles de l'appelant
  details: string;                    // récit détaillé, donné si on le demande
  victims: number;
  suspects: number;
  injuries: boolean;
  weapons: string;                    // '' = aucune
  suspectDescription: string;         // '' = aucun auteur
  suspectDirection: string;           // '' = aucun auteur
  requiredUnits: number;              // moyens réellement nécessaires (pour le bilan)
}

export interface IncomingCall {
  id: string;
  callerPhoneNumber: string;          // affiché dans la file : numéro ou "Numéro masqué"
  callerStressLevel: number;          // 0 à 100, état initial
  truth: CallTruth;
}

export interface TranscriptLine {
  from: 'APPELANT' | 'OPERATEUR' | 'SYSTEME';
  text: string;
}

/** Appel décroché : conversation libre + fiche en construction. */
export interface ActiveCall {
  call: IncomingCall;
  transcript: TranscriptLine[];
  stress: number;                     // 0 à 100, courant ; 100 = l'appelant raccroche
  topics: Record<string, number>;     // sujets déjà abordés → nombre de fois (détecte les répétitions)
  pending: boolean;                   // true tant que l'appelant n'a pas répondu
  endReason: 'FIN' | 'RACCROCHE' | 'OPERATEUR' | null;
  draft: IncidentDraft;
}

// ───────── Carte & état global (AJOUT) ─────────

export interface Sector {
  id: string;
  name: string;               // "CSP Melun Centre", "COB Dammarie"
  service: ServiceType;
  polygon: Coordinates[];
}

export interface RadioMessage {
  id: string;
  timestamp: number;
  from: string;               // indicatif ou "SALLE"
  to: string;
  text: string;               // "De PAM 2 pour salle, arrivés sur les lieux"
  urgent: boolean;
}

export interface GameState {
  now: number;                // ms simulées
  timeScale: number;
  paused: boolean;
  service: ServiceType;       // poste tenu par le joueur (CIC ou CORG)
  units: Record<string, Unit>;
  incidents: Record<string, Incident>;
  callQueue: IncomingCall[];
  activeCall: ActiveCall | null;
  radio: RadioMessage[];
}
