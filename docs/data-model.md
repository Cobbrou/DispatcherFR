# Modèle de données TypeScript

Base : `CONTEXT.md` §5, adaptée. Les écarts sont signalés `// AJOUT` et justifiés en fin de document. Ce code est copié dans `src/types/index.ts` : toute modification se fait dans les deux fichiers.

Principe directeur : **le joueur est seul responsable de la fiche**. Rien n'est prérempli par le jeu ; l'appelant ne « révèle » pas de champs, il répond à des questions libres et le joueur saisit ce qu'il retient.

```typescript
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
  victims: number;
  suspects: number;
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
```

## Moteur de réponse de l'appelant (hors types)

Le texte de l'opérateur est libre ; l'appelant répond via l'interface `CallerEngine` (`src/core/callerEngine.ts`) :

```typescript
interface CallerReply {
  text: string;            // réplique de l'appelant
  stressDelta: number;     // variation du stress (négatif = apaise)
  topics: string[];        // sujets traités, pour détecter les répétitions
  end: 'FIN' | null;       // l'appelant conclut l'appel
}

interface CallerEngine {
  opening(call: IncomingCall): string;
  reply(active: ActiveCall, operatorText: string): Promise<CallerReply>;
}
```

Implémentation actuelle : procédurale locale (mots-clés + tirages aléatoires). Une implémentation LLM (API) pourra la remplacer sans toucher au reste : `reply` est déjà asynchrone et `CallTruth` fournit le contexte à lui donner.

## Justification des changements

| Changement | Raison |
| :--- | :--- |
| `URGENCE_RADIO` dans `UnitStatus` | Incohérence du cahier des charges : statut décrit en §2.3, absent du type §5 |
| `Category` | Les catégories viennent du glossaire officiel (313 lignes, niveau 1 à 5). Le niveau devient la gravité proposée |
| `Incident.title` / `code` supprimés → `category` | Le libellé de catégorie du glossaire remplace titre et code interne |
| `IncidentDetails` | Tout ce que l'opérateur saisit (requérant, lieu, faits, victimes, auteurs, armes…) ; séparé de l'état piloté par le moteur |
| `Incident.coordinates` nullable | L'adresse est tapée par le joueur ; elle peut ne pas être géocodable |
| `IncidentDraft.gravity` nullable | Dérivée de la catégorie ; null tant que la catégorie n'est pas du glossaire |
| `CallDialogueNode`, `revealsInfo`, `calmImpact` supprimés | Plus de dialogue prédéfini : réponses du joueur libres, appelant généré |
| `CallTruth` | Données cachées d'un appel tiré au hasard ; sert de contexte au moteur de réponse et au futur bilan (comparaison fiche ↔ vérité) |
| `ActiveCall.topics`, `pending` | Détection des questions répétées ; état d'attente pendant la réponse (utile pour un LLM) |
| `Incident.zone`, `Unit.sectorId`, `Sector`, `RadioMessage`, `GameState`, `IncidentStatus`, `IncidentOutcome` | Voir `architecture.md` et `CONTEXT.md` §3.3–3.4, §6 |
