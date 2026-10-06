import type { FactKey } from '../types';

/** Un détail demandable : valeurs possibles (une est tirée) et chance que l'appelant le sache. */
export interface FactSpec {
  values: string[];
  /** Chance de savoir, avant l'effet de la personnalité ; 1 = toujours su (sauf panique extrême : voir le générateur). */
  known: number;
  /** Bribe donnée quand l'appelant ne sait qu'à moitié. */
  partial?: string[];
  /** Réponse quand il ne sait pas (sinon formule générique du sujet). */
  unknown?: string[];
}

export interface VehicleSpec {
  kind: 'CAR' | 'SCOOTER';
  /** Chance de connaître marque et couleur. */
  known: number;
  /** Chance d'avoir retenu la plaque. */
  plateKnown: number;
}

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
  /** Moment des faits, pour la réponse à « quand ? » (sinon `facts.WHEN`). */
  when?: 'ONGOING' | 'RECENT' | 'OLD';
  /** Véhicule concerné : génère type, couleur et plaque cohérents. */
  vehicle?: VehicleSpec;
  /** Phrases de fuite propres au scénario (sinon tirées de `fleeMeans`). */
  flight?: string[];
  facts?: Partial<Record<FactKey, FactSpec>>;
}

export const WHEN = {
  ONGOING: ["C'est en train de se passer, là, maintenant.", 'Ça vient de commencer, il y a une ou deux minutes.', 'Il y a deux minutes, pas plus.'],
  RECENT: ["Il y a cinq minutes à peine.", 'Il y a une dizaine de minutes.', "Il y a un quart d'heure environ."],
  OLD: ["Cette nuit, je m'en suis rendu compte ce matin.", 'Hier soir, mais je le découvre maintenant.', 'Je ne sais pas exactement, dans la journée.'],
} as const;

const NO_ONE_KNOWN = ['Non, je ne le connais pas.', "Non, c'est un inconnu pour moi."];

export const templates: IncidentTemplate[] = [
  {
    category: 'vol avec violences', weight: 10, when: 'RECENT',
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
    facts: {
      HOW: { known: 1, values: ["Il est arrivé par derrière, m'a poussé et a arraché mon sac.", "Il m'a bloqué contre un mur, m'a frappé, puis il a pris mes affaires.", "Ils m'ont encerclé, l'un m'a frappé pendant que l'autre prenait mes affaires."] },
      INJURY_DETAIL: {
        known: 0.9, values: ["J'ai le nez qui saigne et la lèvre fendue.", "Il m'a frappé au visage, j'ai mal à la mâchoire.", "Je saigne à l'arcade et j'ai la tête qui tourne."],
        partial: ["J'ai mal à la tête, je ne sais pas trop ce que j'ai."],
      },
      CONSCIOUS: { known: 1, values: ["Oui, je suis conscient, mais j'ai la tête qui tourne.", "Oui, je vous parle, ça va, juste sonné."] },
      STOLEN_ITEMS: { known: 1, values: ['Mon sac, avec mon portefeuille, mon téléphone et mes clés.', "Mon téléphone, mon portefeuille et mon sac, j'ai tout perdu."] },
      KNOWS_SUSPECT: { known: 0.95, values: NO_ONE_KNOWN, partial: ["Je ne sais pas, il avait la capuche sur la tête."] },
      ALCOHOL: { known: 0.6, values: ["Non, je ne crois pas qu'il avait bu.", 'Peut-être, il sentait l\'alcool.'] },
    },
  },
  {
    category: "vol à l'arraché", weight: 6, when: 'ONGOING',
    openings: [
      "Quelqu'un vient de m'arracher mon sac à main !",
      "Un scooter vient de passer, on m'a arraché mon sac !",
    ],
    details: ["Ils étaient deux sur un scooter, ça a été très vite.", "Il m'a pris le sac par l'épaule et il a couru."],
    victims: [1, 1], suspects: [1, 2], weaponChance: 0, weapons: [], injuryChance: 0.2, units: [1, 2],
    vehicle: { kind: 'SCOOTER', known: 0.6, plateKnown: 0.2 },
    flight: ['Ils sont partis en scooter vers la gare.', "Ils ont filé en scooter par la rue d'en face."],
    facts: {
      HOW: { known: 1, values: ['Le scooter est passé tout près de moi, le passager a tiré sur mon sac.', "Il m'a pris le sac par l'épaule en passant, j'ai été entraînée sur quelques mètres."] },
      INJURY_DETAIL: { known: 1, values: ["Il m'a fait tomber, j'ai mal au bras et au genou.", "Je n'ai rien, juste très peur."] },
      CONSCIOUS: { known: 1, values: ["Oui, ça va, je suis juste sous le choc."] },
      STOLEN_ITEMS: { known: 1, values: ['Mon sac à main, avec mon portefeuille et mes clés.', "Mon sac, il y avait mon téléphone et ma carte bleue dedans."] },
      KNOWS_SUSPECT: { known: 1, values: ['Non, je ne les ai jamais vus.'] },
    },
  },
  {
    category: 'différend violences conjugales', weight: 6, when: 'ONGOING',
    openings: [
      'Mon mari me frappe, venez vite !',
      "Mon conjoint est hors de lui, j'ai peur qu'il me fasse du mal.",
    ],
    details: ["Il a bu, il casse tout dans l'appartement et il me crie dessus depuis une demi-heure."],
    victims: [1, 2], suspects: [1, 1], weaponChance: 0.25, weapons: ['un fusil de chasse', 'un couteau de cuisine'],
    injuryChance: 0.5, units: [2, 3],
    facts: {
      WHEN: { known: 1, values: ['Ça a commencé il y a une demi-heure, mais ça empire.', "Là, à l'instant, il vient de me jeter contre le mur."] },
      HOW: { known: 1, values: ["Il est rentré ivre, il m'a reproché des choses et il s'est mis à me frapper.", "On se disputait, il m'a attrapée par les cheveux et il me secoue."] },
      INJURY_DETAIL: { known: 1, values: ["Il m'a frappée au visage, j'ai la lèvre qui saigne.", "J'ai mal au bras, il me l'a tordu, et j'ai un coup sur la joue."] },
      CONSCIOUS: { known: 1, values: ['Oui, je vous parle, je suis enfermée dans la salle de bain.'] },
      CHILDREN: { known: 1, values: ['Oui, mes deux enfants sont dans leur chambre.', 'Ma fille de 6 ans est là, elle pleure.', 'Non, je suis seule avec lui.'] },
      ALCOHOL: { known: 1, values: ['Oui, il a beaucoup bu ce soir.', 'Non, pas cette fois, il est juste en colère.'] },
      KNOWS_SUSPECT: { known: 1, values: ["C'est mon mari, il vit ici.", "C'est mon conjoint, on habite ensemble."] },
      INSIDE: { known: 1, values: ["Il est dans le salon, je me suis enfermée dans la salle de bain.", "Il est dans l'appartement avec moi, il bloque la porte."] },
    },
  },
  {
    category: 'différend violences conjugales', weight: 3, when: 'ONGOING',
    openings: ["Il y a une dispute chez mes voisins, la femme hurle, j'entends des coups."],
    details: ["Ça dure depuis un moment, on entend des objets qui tombent et elle pleure."],
    victims: [1, 1], suspects: [1, 1], weaponChance: 0.1, weapons: ['un couteau de cuisine'],
    injuryChance: 0.4, units: [2, 3],
    facts: {
      WHEN: { known: 1, values: ['Ça dure depuis une vingtaine de minutes.', 'Ça vient de repartir, à l\'instant.'] },
      HOW: { known: 0.9, values: ['Je les entends à travers le mur, ça cogne contre la cloison et elle crie.'] },
      INJURY_DETAIL: { known: 0.15, values: ["Je n'en sais rien, je ne les vois pas."], partial: ["Je l'ai croisée hier avec un bleu sur le visage."], unknown: ["Je ne sais pas, je les entends seulement à travers le mur."] },
      CONSCIOUS: { known: 0.2, values: ['Je l\'entends encore crier, donc oui.'], unknown: ['Je ne peux pas savoir, je ne la vois pas.'] },
      CHILDREN: { known: 0.6, values: ["Oui, je crois qu'il y a des enfants, j'entends pleurer.", 'Ils ont un petit garçon, je crois.'] },
      ALCOHOL: { known: 0.4, values: ['Oui, il rentre souvent saoul.'] },
      KNOWS_SUSPECT: { known: 1, values: ["C'est le couple du deuxième, je ne les connais pas bien."] },
      INSIDE: { known: 0.7, values: ["Ils sont chez eux, c'est l'appartement d'à côté."] },
    },
  },
  {
    category: 'différend violences intra familiales', weight: 6, when: 'ONGOING',
    openings: [
      "Mon fils s'est mis à tout casser à la maison, il me menace.",
      "Ma fille est en crise, elle jette des affaires et je n'arrive plus à la calmer.",
    ],
    details: ["Ça a commencé pour une histoire d'argent et ça a dégénéré.", "Il est hors de contrôle, il hurle et il jette des affaires."],
    victims: [1, 2], suspects: [1, 1], weaponChance: 0.1, weapons: ['un couteau', 'une barre de fer'],
    injuryChance: 0.3, units: [2, 2],
    facts: {
      WHEN: { known: 1, values: ['Ça a démarré il y a une demi-heure.', 'Depuis une vingtaine de minutes, ça monte.'] },
      HOW: { known: 1, values: ["Je lui ai refusé de l'argent, il s'est mis à hurler et à tout renverser.", "On s'est disputés pour un téléphone, elle a pété les plombs."] },
      INJURY_DETAIL: { known: 1, values: ["Il m'a poussée, j'ai mal à l'épaule.", "Je n'ai rien de grave, juste une égratignure au bras.", "Il m'a giflée, j'ai la joue qui chauffe."] },
      CONSCIOUS: { known: 1, values: ["Oui, je vous parle, je suis dans la cuisine."] },
      CHILDREN: { known: 1, values: ['Mon plus petit est enfermé dans sa chambre.', "Non, il n'y a que nous deux."] },
      ALCOHOL: { known: 0.8, values: ['Il a bu, je crois, et il a peut-être pris autre chose.', "Non, je ne pense pas, c'est la colère."] },
      KNOWS_SUSPECT: { known: 1, values: ["C'est mon fils, il a dix-neuf ans.", "C'est ma fille, elle a seize ans."] },
      INSIDE: { known: 1, values: ["Elle est dans le salon, moi je suis dans la cuisine.", 'Il est dans sa chambre, il casse tout là-haut.'] },
    },
  },
  {
    category: 'tapage', weight: 9, when: 'ONGOING',
    openings: [
      "Mes voisins font une fête et il est deux heures du matin.",
      "Il y a une musique à fond depuis des heures chez le voisin du dessus.",
    ],
    details: ["J'ai déjà sonné chez eux, ils n'ouvrent pas et la musique est toujours aussi forte.", "Ça dure depuis ce soir, il y a aussi des cris dans l'escalier."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    facts: {
      WHEN: { known: 1, values: ['Ça dure depuis 22 heures.', 'Ça fait trois heures que ça dure.', 'Depuis la fin de la soirée, ça ne s\'arrête pas.'] },
      HOW: { known: 1, values: ["La musique est à fond et il y a des cris dans l'escalier, on ne dort plus.", 'Ils ont mis des basses qui font trembler le plafond.'] },
      ALCOHOL: { known: 0.5, values: ['Ils ont tous bu, on les entend chanter.'] },
      KNOWS_SUSPECT: { known: 1, values: ["C'est le voisin du dessus, je ne connais pas son nom.", 'Ce sont les jeunes du troisième.'] },
    },
  },
  {
    category: 'cambriolage résidence', weight: 4, when: 'ONGOING',
    openings: ["On est en train de cambrioler chez moi, j'entends du bruit au rez-de-chaussée !"],
    details: ["J'ai entendu des pas en bas, je me suis enfermée dans la chambre."],
    victims: [0, 1], suspects: [1, 3], weaponChance: 0.05, weapons: ['un pied-de-biche'], injuryChance: 0, units: [1, 2],
    facts: {
      HOW: { known: 1, values: ["J'ai entendu un grand bruit de verre, puis des pas, puis des tiroirs qu'on ouvre."] },
      ENTRY: { known: 0.6, values: ['Par la fenêtre de derrière, j\'ai entendu le verre se briser.', "Par la porte d'entrée, j'ai entendu un grand coup."], unknown: ['Je ne sais pas, je suis enfermée, je ne vois rien.'] },
      INSIDE: { known: 1, values: ["Oui, ils sont encore en bas, je les entends marcher.", "Oui, ils sont dans la maison, au rez-de-chaussée."] },
      STOLEN_ITEMS: { known: 0.1, values: ['Je ne sais pas encore.'], unknown: ["Je ne sais pas ce qu'ils prennent, je suis enfermée dans la chambre."] },
      KNOWS_SUSPECT: { known: 0.1, values: ['Non.'], unknown: ["Je ne les vois pas, je les entends seulement."] },
      CONSCIOUS: { known: 1, values: ["Oui, moi ça va, mais j'ai très peur."] },
      CHILDREN: { known: 1, values: ['Mon fils dort à côté de moi.', 'Non, je suis seule à la maison.'] },
    },
  },
  {
    category: 'cambriolage résidence', weight: 4, when: 'OLD',
    openings: ['Je rentre chez moi et la porte est forcée, tout est retourné.'],
    details: ["La fenêtre de derrière est cassée et il manque la télévision."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 2],
    facts: {
      WHEN: { known: 0.85, values: ["Je suis parti ce matin à huit heures, je rentre à midi.", "Je n'étais pas là depuis hier soir.", 'Nous étions en week-end, on rentre à l\'instant.'], partial: ["Je suis parti ce matin, je ne sais pas à quelle heure c'est arrivé."] },
      HOW: { known: 1, values: ["Je ne les ai pas vus, je découvre tout en rentrant : la porte est forcée et les tiroirs sont par terre."] },
      ENTRY: { known: 1, values: ["La porte est forcée, la serrure est arrachée.", 'La fenêtre du salon est cassée, elle donne sur le jardin.'] },
      INSIDE: { known: 0.9, values: ["Je ne sais pas, je suis resté sur le seuil, je n'ose pas entrer."], unknown: ["Je n'ai pas osé entrer pour vérifier."] },
      STOLEN_ITEMS: { known: 0.8, values: ["La télévision, l'ordinateur portable et les bijoux de ma femme.", 'La télévision et la console, et il manque de la monnaie dans le tiroir.'], partial: ["Il manque au moins la télévision, mais je n'ai pas tout vérifié."] },
      KNOWS_SUSPECT: { known: 1, values: ["Non, je ne vois pas qui, je n'ai rien vu."] },
      CONSCIOUS: { known: 1, values: ["Moi ça va, personne n'était là."] },
    },
  },
  {
    category: 'accident circulation corporel', weight: 8, when: 'ONGOING',
    openings: [
      'Il y a eu un accident, une voiture a percuté un scooter, le conducteur est au sol.',
      'Deux voitures se sont percutées devant moi, il y a des blessés.',
    ],
    details: ["Le scooter est par terre, le conducteur se tient la jambe et ne peut pas se relever.", "Une voiture a grillé le stop, le choc a été violent."],
    victims: [1, 3], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 1, units: [1, 2],
    vehicle: { kind: 'CAR', known: 0.8, plateKnown: 0.45 },
    facts: {
      HOW: { known: 0.9, values: ['Une voiture a grillé le stop et a percuté le scooter de plein fouet.', 'Deux voitures sont entrées en collision au croisement, de plein fouet.'], partial: ["J'ai entendu le choc, je suis arrivé juste après."] },
      INJURY_DETAIL: {
        known: 0.8, values: ["Le conducteur se tient la jambe, ça a l'air d'une fracture.", "Une personne saigne de la tête, elle est assise sur le trottoir.", 'Il y a une femme qui se plaint du cou et du dos.'],
        partial: ["Il se tient la jambe, mais je ne vois pas plus."],
      },
      CONSCIOUS: { known: 0.9, values: ["Oui, il est conscient, il parle.", "Il est conscient mais il ne bouge pas, il dit qu'il a mal au dos.", "Il a les yeux ouverts mais il ne répond pas bien."] },
      AGE: { known: 0.8, values: ["Un homme d'une trentaine d'années.", 'Une dame âgée, la soixantaine bien passée.', 'Un jeune, peut-être dix-sept ans.'], partial: ['Un adulte, je ne saurais pas dire.'] },
      TRAPPED: { known: 0.9, values: ["Non, personne n'est coincé.", "Oui, une personne est coincée dans la voiture, elle n'arrive pas à sortir."] },
      HAZARD: { known: 0.85, values: ["Il y a de l'essence qui coule sous la voiture.", "Non, pas de fumée, juste du verre partout.", 'Il y a un peu de fumée qui sort du capot.'] },
      ALCOHOL: { known: 0.3, values: ["L'autre conducteur sent l'alcool, je crois."] },
      KNOWS_SUSPECT: { known: 1, values: ['Non, je suis un simple témoin.'] },
    },
  },
  {
    category: 'accident circulation matériel', weight: 6, when: 'RECENT',
    openings: [
      "Un automobiliste m'a embouti, personne n'est blessé mais il veut partir.",
      "Accrochage entre deux voitures, ça bloque toute la rue.",
    ],
    details: ["Les deux véhicules sont abîmés mais tout le monde va bien.", "On s'est accrochés au rond-point, il refuse de faire un constat."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    vehicle: { kind: 'CAR', known: 0.85, plateKnown: 0.6 },
    facts: {
      HOW: { known: 1, values: ["Il n'a pas respecté la priorité au rond-point et m'a touché sur le côté.", "Il a reculé sans regarder et il a enfoncé mon aile."] },
      HAZARD: { known: 1, values: ["Non, rien de dangereux, mais ça bloque la rue.", "Il y a un peu d'huile par terre, sinon rien."] },
      ALCOHOL: { known: 0.5, values: ["Non, il n'a pas l'air d'avoir bu.", "Je ne sais pas, mais il est très nerveux."] },
    },
  },
  {
    category: 'rixe bagarre', weight: 7, when: 'ONGOING',
    openings: [
      "Il y a une bagarre devant le bar, ils se tapent dessus !",
      'Des jeunes se battent sur la place, il y en a un à terre.',
    ],
    details: ["Ça a commencé par une embrouille à la sortie, maintenant ils sont une dizaine.", "Il y a des cris, des bouteilles qui volent, les gens s'écartent."],
    victims: [1, 3], suspects: [2, 6], weaponChance: 0.15, weapons: ['une bouteille cassée', 'un couteau'], injuryChance: 0.6, units: [2, 3],
    facts: {
      HOW: { known: 0.9, values: ["Ça a commencé par une dispute à la sortie du bar, puis ça a dégénéré.", "Deux groupes se sont mis à s'insulter, puis les coups ont commencé."], partial: ["Je suis arrivé en plein milieu, je ne sais pas comment ça a commencé."] },
      INJURY_DETAIL: { known: 0.7, values: ["Il y en a un qui a le visage en sang, il est à terre.", 'Un garçon a reçu un coup de bouteille à la tête.'], partial: ["Il y en a un par terre, je ne vois pas bien ses blessures."] },
      CONSCIOUS: { known: 0.8, values: ["Celui qui est à terre bouge un peu mais il ne répond pas bien.", "Il est conscient, il essaie de se relever."] },
      AGE: { known: 0.8, values: ["Des jeunes, entre dix-huit et vingt-cinq ans."], partial: ["Ils sont assez jeunes, je ne saurais pas dire."] },
      ALCOHOL: { known: 0.8, values: ['Ils ont tous bu, ça sort du bar.'] },
      KNOWS_SUSPECT: { known: 1, values: ['Non, des jeunes que je ne connais pas.'] },
    },
  },
  {
    category: 'secours à personne blessée – inconsciente – malaise', weight: 7, when: 'RECENT',
    openings: [
      'Il y a un homme par terre, il ne bouge plus.',
      'Ma voisine a fait un malaise, elle ne répond plus.',
    ],
    details: ["Elle respire mais elle ne répond pas quand je lui parle.", "Il est tombé d'un coup dans la rue, les gens autour ne savent pas quoi faire."],
    victims: [1, 1], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 1, units: [1, 1],
    facts: {
      HOW: { known: 1, values: ["Il est tombé d'un coup, sans rien faire de particulier.", "Elle s'est plainte d'avoir mal à la tête, puis elle s'est affaissée."] },
      INJURY_DETAIL: { known: 0.7, values: ["Il s'est cogné la tête en tombant, il y a un peu de sang.", 'Je ne vois pas de blessure, il est juste très pâle.'], partial: ["Je n'ose pas le toucher, je ne vois pas bien."] },
      CONSCIOUS: { known: 0.85, values: ["Elle respire mais elle ne répond pas quand je lui parle.", "Il est conscient mais très pâle, il dit qu'il a mal à la poitrine.", "Il ne bouge plus et je ne sais pas s'il respire."], partial: ["Il a l'air de respirer, mais je n'en suis pas sûr."] },
      AGE: { known: 0.9, values: ['Environ soixante-dix ans.', "Une femme d'une quarantaine d'années.", 'Un homme âgé, quatre-vingts ans peut-être.'], partial: ["Quelqu'un d'âgé, je ne saurais pas dire."] },
      ALCOHOL: { known: 0.6, values: ["Je ne crois pas, il ne sent pas l'alcool.", "Oui, il sent l'alcool."] },
      KNOWS_SUSPECT: { known: 0.7, values: ["C'est ma voisine, elle est diabétique, je crois.", "Non, je ne le connais pas, je passais dans la rue."] },
    },
  },
  {
    category: 'vol véhicule', weight: 3, when: 'OLD',
    openings: ["On m'a volé ma voiture, elle n'est plus là où je l'avais garée."],
    details: ["Je l'avais garée hier soir, il reste des morceaux de verre par terre."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    vehicle: { kind: 'CAR', known: 1, plateKnown: 0.85 },
    facts: {
      WHEN: { known: 0.9, values: ["Je l'ai garée hier vers vingt-deux heures, ce matin elle n'était plus là.", "Elle a disparu dans l'heure, j'étais au restaurant.", "Elle était là hier soir, je ne l'ai pas utilisée de la journée."], partial: ["Ce matin elle n'était plus là, mais je ne sais pas quand ils l'ont prise."] },
      HOW: { known: 0.9, values: ["Il reste des morceaux de verre par terre, je pense qu'ils ont cassé la vitre.", "Je ne sais pas comment ils ont fait, il n'y a aucune trace, juste la place vide."] },
      STOLEN_ITEMS: { known: 0.9, values: ["Dans la voiture il y avait mon ordinateur portable et mes papiers.", "Rien d'autre dedans, juste le véhicule."] },
      KNOWS_SUSPECT: { known: 1, values: ["Non, je n'ai vu personne."] },
    },
  },
  {
    category: 'vol véhicule', weight: 3, when: 'ONGOING',
    openings: ['Je viens de voir deux types qui forcent une voiture dans ma rue !'],
    details: ["Ils ont cassé la vitre et ils essaient de la démarrer."],
    victims: [0, 0], suspects: [1, 2], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    vehicle: { kind: 'CAR', known: 0.85, plateKnown: 0.3 },
    facts: {
      HOW: { known: 1, values: ["Ils ont cassé la vitre côté conducteur, puis l'un s'est installé au volant.", "Ils ont forcé la portière avec un outil, l'un fait le guet."] },
      ENTRY: { known: 1, values: ['Ils ont cassé la vitre côté conducteur.', 'Ils ont forcé la portière avec un outil.'] },
      INSIDE: { known: 0.9, values: ["Oui, il y en a un au volant qui essaie de démarrer.", "Oui, ils sont montés dedans, l'autre fait le guet."] },
      STOLEN_ITEMS: { known: 0.1, values: ['Je ne sais pas.'], unknown: ["Je ne sais pas ce qu'il y a dedans, ce n'est pas ma voiture."] },
      KNOWS_SUSPECT: { known: 1, values: ['Non, je ne les ai jamais vus dans le quartier.'] },
    },
  },
  {
    category: 'personne suspecte rôdeur', weight: 5, when: 'ONGOING',
    openings: [
      'Il y a un homme qui rôde autour des voitures depuis une demi-heure.',
      'Quelqu\'un regarde par les fenêtres des maisons dans ma rue.',
    ],
    details: ["Il essaie les poignées des portières, il regarde partout autour de lui.", "Il est déjà repassé trois fois devant chez moi."],
    victims: [0, 0], suspects: [1, 1], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    facts: {
      WHEN: { known: 1, values: ['Depuis une bonne demi-heure.', "Ça fait vingt minutes que je le vois tourner."] },
      HOW: { known: 1, values: ["Il essaie les poignées des portières, une par une, puis il repart.", "Il s'arrête devant chaque maison et regarde par-dessus les clôtures."] },
      KNOWS_SUSPECT: { known: 1, values: ['Non, je ne l\'ai jamais vu dans le quartier.', "Je crois que je l'ai déjà vu traîner par ici."] },
      ALCOHOL: { known: 0.3, values: ["Il a l'air ivre, il titube."], partial: ['Il marche bizarrement, mais je ne sais pas pourquoi.'] },
    },
  },
  {
    category: 'menaces', weight: 5, when: 'RECENT',
    openings: [
      "Mon ex m'appelle et me menace, il dit qu'il va venir chez moi.",
      "Un voisin m'a menacé devant ma porte.",
    ],
    details: ["Il m'a dit qu'il allait me faire regretter, ce n'est pas la première fois.", "Il m'a envoyé des messages toute la soirée."],
    victims: [1, 1], suspects: [1, 1], weaponChance: 0.05, weapons: ['un couteau'], injuryChance: 0, units: [1, 1],
    flight: ["Je ne sais pas où il est, il m'appelle d'un numéro masqué.", "Il est chez lui, je crois, de l'autre côté de la rue."],
    facts: {
      WHEN: { known: 1, values: ["Il m'a appelée il y a dix minutes, et il m'écrit depuis ce matin.", "C'était il y a un quart d'heure."] },
      HOW: { known: 1, values: ["Il m'appelle toute la soirée et il a dit qu'il viendrait avec un couteau.", "Il a dit qu'il allait me faire regretter, devant ma porte, devant des témoins."] },
      KNOWS_SUSPECT: { known: 1, values: ["Oui, je le connais, ce n'est pas la première fois.", 'Oui, je sais qui c\'est, on a déjà eu des problèmes.'] },
      ALCOHOL: { known: 0.5, values: ['Il boit beaucoup en ce moment.', 'Il avait bu, ça se sentait.'] },
      CHILDREN: { known: 1, values: ['Oui, mon fils de quatre ans est avec moi.', 'Non, je suis seule.'] },
      CONSCIOUS: { known: 1, values: ["Oui, moi ça va, je n'ai pas été touchée."] },
    },
  },
  {
    category: 'agression', weight: 7, when: 'RECENT',
    openings: [
      "Je viens d'être agressé dans la rue, un homme m'a frappé sans raison.",
      "On m'a attaquée à la sortie de la gare.",
    ],
    details: ["Il m'a insulté puis il m'a mis un coup de poing, je ne le connais pas.", "Ils étaient deux, ils m'ont poussée contre le mur."],
    victims: [1, 1], suspects: [1, 2], weaponChance: 0.1, weapons: ['un couteau'], injuryChance: 0.7, units: [1, 2],
    facts: {
      HOW: { known: 1, values: ["Il m'a abordé pour me demander une cigarette, puis il m'a frappé sans prévenir.", "Ils m'ont suivie depuis la gare, puis ils m'ont poussée contre le mur."] },
      INJURY_DETAIL: { known: 1, values: ["Il m'a donné un coup de poing, j'ai la lèvre fendue.", "J'ai mal aux côtes et au visage.", "Ça saigne au niveau de l'arcade."] },
      CONSCIOUS: { known: 1, values: ["Oui, je suis conscient, j'ai juste mal.", "Oui, je vous parle, je suis assise sur un banc."] },
      KNOWS_SUSPECT: {
        known: 0.95, values: ['Non, je ne le connais pas.', "Il me semble que c'est quelqu'un du quartier, je l'ai déjà croisé."],
        partial: ["Je ne sais pas, j'ai l'impression de l'avoir déjà vu."],
      },
      ALCOHOL: { known: 0.6, values: ['Il avait bu, ça se sentait.', "Il avait l'air normal, pas ivre."], partial: ['Il parlait bizarrement, je ne sais pas.'] },
      STOLEN_ITEMS: { known: 1, values: ["Rien, il n'a rien pris, il voulait juste me frapper.", "Il m'a pris mon téléphone, c'est tout."] },
    },
  },
  {
    category: 'incendie véhicule', weight: 4, when: 'RECENT',
    openings: ['Une voiture est en train de brûler dans ma rue !', "Il y a une voiture en feu devant l'immeuble, les flammes montent !"],
    details: ["Le feu a pris sous le capot, il y a de la fumée noire partout.", "Elle brûle depuis cinq minutes, je ne vois personne autour."],
    victims: [0, 0], suspects: [0, 0], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    vehicle: { kind: 'CAR', known: 0.6, plateKnown: 0.15 },
    facts: {
      HOW: { known: 0.8, values: ["Ça a pris sous le capot, il y a eu un bruit, puis les flammes.", "Je ne sais pas, je l'ai vue brûler d'un coup."], partial: ["J'ai entendu un bruit et j'ai vu les flammes, c'est tout."] },
      INSIDE: { known: 0.85, values: ["Non, il n'y a personne dedans, je crois.", 'Je ne vois personne dedans.'] },
      HAZARD: { known: 0.9, values: ["Elle est garée près d'autres voitures, le feu peut se propager.", "Il y a un transformateur juste à côté.", "Elle est à dix mètres de l'immeuble, la fumée entre dans les fenêtres."] },
      KNOWS_SUSPECT: { known: 1, values: ["Non, je n'ai vu personne s'enfuir."] },
    },
  },
  {
    category: 'dégradations', weight: 4, when: 'ONGOING',
    openings: ["Des jeunes cassent les vitres de l'abribus.", "Quelqu'un est en train de taguer la façade de l'école."],
    details: ["Ils sont en train de tout casser avec des pierres.", "Ça fait un moment, ils ont déjà cassé deux vitres."],
    victims: [0, 0], suspects: [2, 4], weaponChance: 0, weapons: [], injuryChance: 0, units: [1, 1],
    facts: {
      HOW: { known: 1, values: ['Ils lancent des pierres sur les vitres, ils rient.', "Ils ont des bombes de peinture, ils recouvrent toute la façade."] },
      KNOWS_SUSPECT: { known: 0.9, values: ['Non, je ne les connais pas.', 'Je crois que ce sont des jeunes du quartier.'] },
      ALCOHOL: { known: 0.4, values: ["Ils ont l'air d'avoir bu, ils crient beaucoup."] },
      AGE: { known: 0.8, values: ['Des adolescents, quinze ou seize ans.', 'Plutôt des jeunes de vingt ans.'] },
    },
  },
  {
    category: 'demande renseignement', weight: 3, when: 'RECENT',
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

/** Voitures (toutes féminines : « une Renault Clio ») et scooters, avec couleurs accordées [masculin, féminin]. */
export const carModels = ['Renault Clio', 'Peugeot 208', 'Citroën C3', 'Volkswagen Golf', 'Renault Mégane', 'Dacia Sandero', 'Toyota Yaris', 'Peugeot 308', 'Ford Fiesta', 'Renault Twingo'];
export const scooterModels = ['Piaggio', 'Yamaha Nitro', 'MBK Booster', 'Peugeot Kisbee', 'Honda SH'];
export const vehicleColors: [masculine: string, feminine: string][] = [
  ['noir', 'noire'], ['gris', 'grise'], ['blanc', 'blanche'], ['rouge', 'rouge'], ['bleu', 'bleue'], ['vert', 'verte'],
];

export const openingPrefixes = {
  CALME: ['Bonjour, ', 'Bonsoir, ', 'Allô, bonjour, '],
  PANIQUE: ['Allô ?! ', 'Au secours ! ', 'Vite ! ', 'Allô, allô ?! '],
  EVASIF: ['Allô... ', 'Oui, bonjour, je ne sais pas si je dois appeler, mais ', 'Euh, bonjour... '],
} as const;
