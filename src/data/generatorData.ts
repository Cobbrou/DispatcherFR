export interface IncidentTemplate {
  /** Libellé exact du glossaire. */
  category: string;
  weight: number;
  openings: string[];
  details: string[];
  victims: [number, number];
  suspects: [number, number];
  weaponChance: number;
  weapons: string[];
  injuryChance: number;
  units: [number, number];
}

export const templates: IncidentTemplate[] = [
  {
    category: 'vol avec violences', weight: 10,
    openings: [
      "On vient de m'arracher mon sac, il m'a frappé !",
      "Un type vient de me voler mon téléphone et il m'a mis un coup de poing !",
      "Je viens de me faire agresser, on m'a pris mon portefeuille !",
    ],
    details: [
      "Il m'a poussé par terre et il a pris mon sac, puis il est parti en courant.",
      "Ils m'ont frappé au visage et ils sont partis avec toutes mes affaires.",
    ],
    victims: [1, 1], suspects: [1, 3], weaponChance: 0.3, weapons: ['un couteau', 'une bombe lacrymogène', 'une batte'],
    injuryChance: 0.7, units: [2, 3],
  },
  {
    category: "vol à l'arraché", weight: 6,
    openings: [
      "Quelqu'un vient de m'arracher mon sac à main !",
      "Un scooter vient de passer, on m'a arraché mon collier !",
    ],
    details: ["Ils étaient deux sur un scooter, ça a été très vite.", "Il m'a pris le sac par l'épaule et il a couru."],
    victims: [1, 1], suspects: [1, 2], weaponChance: 0, weapons: [], injuryChance: 0.2, units: [1, 2],
  },
  {
    category: 'différend violences conjugales', weight: 9,
    openings: [
      'Mon mari me frappe, venez vite !',
      "Il y a une dispute chez mes voisins, la femme hurle, j'entends des coups.",
      "Mon conjoint est hors de lui, j'ai peur qu'il me fasse du mal.",
    ],
    details: [
      "Il a bu, il casse tout dans l'appartement et il me crie dessus depuis une demi-heure.",
      "Ça dure depuis un moment, on entend des objets qui tombent et elle pleure.",
    ],
    victims: [1, 2], suspects: [1, 1], weaponChance: 0.25, weapons: ['un fusil de chasse', 'un couteau de cuisine'],
    injuryChance: 0.5, units: [2, 3],
  },
  {
    category: 'différend violences intra familiales', weight: 6,
    openings: [
      "Mon fils s'est mis à tout casser à la maison, il me menace.",
      "Il y a une grosse dispute dans la famille d'à côté, ça crie et des objets volent.",
    ],
    details: ["Ça a commencé pour une histoire d'argent et ça a dégénéré.", "Il est hors de contrôle, il hurle et il jette des affaires."],
    victims: [1, 2], suspects: [1, 1], weaponChance: 0.1, weapons: ['un couteau', 'une barre de fer'],
    injuryChance: 0.3, units: [2, 2],
  },
  {
    category: 'tapage', weight: 9,
    openings: [
      "Mes voisins font une fête et il est deux heures du matin.",
      "Il y a une musique à fond depuis des heures chez le voisin du dessus.",
    ],
    details: ["J'ai déjà sonné chez eux, ils n'ouvrent pas et la musique est toujours aussi forte.", "Ça dure depuis ce soir, il y a aussi des cris dans l'escalier."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'cambriolage résidence', weight: 7,
    openings: [
      "On est en train de cambrioler chez moi, j'entends du bruit au rez-de-chaussée !",
      'Je rentre chez moi et la porte est forcée, tout est retourné.',
    ],
    details: ["La fenêtre de derrière est cassée et il manque la télévision.", "J'ai entendu des pas en bas, je me suis enfermée dans la chambre."],
    victims: [0, 1], suspects: [0, 3], weaponChance: 0.05, weapons: ['un pied-de-biche'], injuryChance: 0, units: [1, 2],
  },
  {
    category: 'accident circulation corporel', weight: 8,
    openings: [
      'Il y a eu un accident, une voiture a percuté un scooter, le conducteur est au sol.',
      'Deux voitures se sont percutées devant moi, il y a des blessés.',
    ],
    details: ["Le scooter est par terre, le conducteur se tient la jambe et ne peut pas se relever.", "Une voiture a grillé le stop, le choc a été violent."],
    victims: [1, 3], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 1, units: [1, 2],
  },
  {
    category: 'accident circulation matériel', weight: 6,
    openings: [
      "Un automobiliste m'a embouti, personne n'est blessé mais il veut partir.",
      "Accrochage entre deux voitures, ça bloque toute la rue.",
    ],
    details: ["Les deux véhicules sont abîmés mais tout le monde va bien.", "On s'est accrochés au rond-point, il refuse de faire un constat."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'rixe bagarre', weight: 7,
    openings: [
      "Il y a une bagarre devant le bar, ils se tapent dessus !",
      'Des jeunes se battent sur la place, il y en a un à terre.',
    ],
    details: ["Ça a commencé par une embrouille à la sortie, maintenant ils sont une dizaine.", "Il y a des cris, des bouteilles qui volent, les gens s'écartent."],
    victims: [1, 3], suspects: [2, 6], weaponChance: 0.15, weapons: ['une bouteille cassée', 'un couteau'], injuryChance: 0.6, units: [2, 3],
  },
  {
    category: 'secours à personne blessée – inconsciente – malaise', weight: 7,
    openings: [
      'Il y a un homme par terre, il ne bouge plus.',
      'Ma voisine a fait un malaise, elle ne répond plus.',
    ],
    details: ["Elle respire mais elle ne répond pas quand je lui parle.", "Il est tombé d'un coup dans la rue, les gens autour ne savent pas quoi faire."],
    victims: [1, 1], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 1, units: [1, 1],
  },
  {
    category: 'vol véhicule', weight: 6,
    openings: [
      "On m'a volé ma voiture, elle n'est plus là où je l'avais garée.",
      'Je viens de voir deux types qui forcent une voiture dans ma rue !',
    ],
    details: ["Je l'avais garée hier soir, il reste des morceaux de verre par terre.", "Ils ont cassé la vitre et ils essaient de la démarrer."],
    victims: [0, 1], suspects: [0, 2], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'personne suspecte rôdeur', weight: 5,
    openings: [
      'Il y a un homme qui rôde autour des voitures depuis une demi-heure.',
      'Quelqu\'un regarde par les fenêtres des maisons dans ma rue.',
    ],
    details: ["Il essaie les poignées des portières, il regarde partout autour de lui.", "Il est déjà repassé trois fois devant chez moi."],
    victims: [0, 0], suspects: [1, 1], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'menaces', weight: 5,
    openings: [
      "Mon ex m'appelle et me menace, il dit qu'il va venir chez moi.",
      "Un voisin m'a menacé devant ma porte.",
    ],
    details: ["Il m'a dit qu'il allait me faire regretter, ce n'est pas la première fois.", "Il m'a envoyé des messages toute la soirée."],
    victims: [1, 1], suspects: [1, 1], weaponChance: 0.05, weapons: ['un couteau'], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'agression', weight: 7,
    openings: [
      "Je viens d'être agressé dans la rue, un homme m'a frappé sans raison.",
      "On m'a attaquée à la sortie de la gare.",
    ],
    details: ["Il m'a insulté puis il m'a mis un coup de poing, je ne le connais pas.", "Ils étaient deux, ils m'ont poussée contre le mur."],
    victims: [1, 1], suspects: [1, 2], weaponChance: 0.1, weapons: ['un couteau'], injuryChance: 0.7, units: [1, 2],
  },
  {
    category: 'incendie véhicule', weight: 4,
    openings: ['Une voiture est en train de brûler dans ma rue !', "Il y a une voiture en feu devant l'immeuble, les flammes montent !"],
    details: ["Le feu a pris sous le capot, il y a de la fumée noire partout.", "Elle brûle depuis cinq minutes, je ne vois personne autour."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'dégradations', weight: 4,
    openings: ["Des jeunes cassent les vitres de l'abribus.", "Quelqu'un est en train de taguer la façade de l'école."],
    details: ["Ils sont en train de tout casser avec des pierres.", "Ça fait un moment, ils ont déjà cassé deux vitres."],
    victims: [0, 0], suspects: [2, 4], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
  },
  {
    category: 'demande renseignement', weight: 3,
    openings: [
      'Je voudrais savoir comment déposer plainte pour un vol.',
      'Je cherche à savoir à quelle heure ferme le commissariat.',
    ],
    details: ["On m'a volé mon vélo la semaine dernière et je ne sais pas quoi faire.", "J'ai simplement besoin d'une information pour mes démarches."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [0, 0],
  },
];

export const firstNames = [
  'Camille', 'Julien', 'Sophie', 'Nicolas', 'Karim', 'Laura', 'Mohamed', 'Élodie', 'Thomas', 'Aïcha',
  'Pierre', 'Sandrine', 'Antoine', 'Fatima', 'Lucas', 'Nathalie', 'Hugo', 'Inès', 'Bruno', 'Marie',
];
export const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Benali', 'Lefebvre', 'Garcia', 'Roux', 'Fontaine',
  'Mercier', 'Diallo', 'Girard', 'Petit', 'Lambert', 'Haddad', 'Durand', 'Marchand', 'Colin', 'Perrin',
];

export const landmarks = [
  'devant la pharmacie', 'en face de la boulangerie', "près de l'arrêt de bus", "devant l'école",
  'à côté du tabac', 'devant le supermarché', 'au coin de la rue', "devant l'église",
];

export const suspectSubjects = ['un homme', 'un jeune homme', 'une femme', 'un homme assez grand', 'un homme trapu'];
export const suspectAges = ["d'une vingtaine d'années", "d'une trentaine d'années", "d'une quarantaine d'années", 'assez jeune'];
export const suspectClothes = [
  'capuche noire', 'survêtement gris', 'blouson en cuir', 'casquette rouge', 'sweat bleu', 'doudoune sombre',
];
export const fleeMeans = ['à pied vers le centre-ville', 'en scooter vers la gare', 'dans une voiture sombre', 'en courant dans une rue perpendiculaire'];

export const openingPrefixes = {
  CALME: ['Bonjour, ', 'Bonsoir, ', 'Allô, bonjour, '],
  PANIQUE: ['Allô ?! ', 'Au secours ! ', 'Vite ! ', 'Allô, allô ?! '],
  EVASIF: ['Allô... ', 'Oui, bonjour, je ne sais pas si je dois appeler, mais ', 'Euh, bonjour... '],
} as const;
