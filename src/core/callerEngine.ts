import { chance, pick, type Rng } from '../lib/rng';
import type { ActiveCall, CallTruth, FactKey, IncomingCall } from '../types';

export interface CallerReply {
  text: string;
  /** Variation du stress de l'appelant (négatif = apaise). */
  stressDelta: number;
  /** Sujets traités, pour détecter les questions répétées. */
  topics: Topic[];
  /** L'appelant conclut l'appel. */
  end: 'FIN' | null;
}

/**
 * Point d'extension : remplacer `createProceduralCaller` par une implémentation LLM
 * (même interface, `CallTruth` en contexte) sans toucher au reste du jeu.
 */
export interface CallerEngine {
  opening(call: IncomingCall): string;
  reply(active: ActiveCall, operatorText: string): Promise<CallerReply>;
}

export type Topic =
  | FactKey
  | 'ADDRESS' | 'NAME' | 'PHONE' | 'WHAT' | 'VICTIMS' | 'SUSPECT_COUNT'
  | 'REASSURE' | 'RUDE' | 'CLOSE' | 'UNKNOWN';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Évalués dans l'ordre sur le texte normalisé (sans accents ni ponctuation).
const PATTERNS: [Topic, RegExp][] = [
  ['CLOSE', /(au revoir|bonne soiree|bonne journee|bonne nuit|je vous laisse|je clos|fin de l appel|je raccroche)/],
  ['RUDE', /\b(idiot|imbecile|nul|abruti|ferme la|taisez vous|vous mentez|n importe quoi|pas mon probleme|rappelez demain)\b/],
  ['ADDRESS', /(adresse|\bou\b.{0,25}(etes|trouv|situ|habit|passe|ca se|exact)|quelle rue|quel endroit|quelle ville|quelle commune|localis|lieu exact|numero de la rue)/],
  ['NAME', /(votre nom|vos noms|nom et prenom|nom prenom|prenom|comment vous appelez|vous vous appelez|qui etes vous|identite|epelez)/],
  ['PHONE', /(telephone|portable|votre numero|joindre|rappeler|vous recontacter|numero pour)/],
  ['WHAT', /(que se passe|qu est ce qui|qu est ce qu il|que s est il|racontez|expliquez|decrivez (moi )?(les faits|ce qui)|quel est le probleme|quel probleme|motif|de quoi s agit|quoi exactement|dites moi tout|que voyez vous|ce qui se passe)/],
  ['WHEN', /(quand|depuis (quand|combien)|il y a combien|combien de temps|a quelle heure|ca vient de|vient de se passer|en ce moment)/],
  ['HOW', /(comment (ca|cela|s est|c est|ont ils|a t il|a t elle)|circonstances|deroule|dans quelles conditions|de quelle (facon|maniere))/],
  ['INJURY_DETAIL', /(blessures?|ou (est|sont) (il|elle|ils) blesse|blesse ou\b|ou a t (il|elle) mal|plaie|fracture|coup de couteau|hemorragie|\bgrave\b|gravite|\b(tete|jambe|bras|ventre|thorax|poitrine)\b)/],
  ['CONSCIOUS', /(conscient|inconscient|\brespire\b|respiration|\brepond\b|reagit|\bbouge\b)/],
  ['AGE', /(quel age|\bage\b|personne agee|enfant ou adulte)/],
  ['VICTIMS', /(blesse|victime|saigne|\bsang\b|besoin (des secours|des pompiers|du samu|d une ambulance)|mal quelque part)/],
  ['SUSPECT_COUNT', /(combien (sont|etaient|d individus|de personnes|d agresseurs)|nombre de personnes|ils sont|sont ils|plusieurs|seul ou|auteurs|individus|agresseurs)/],
  ['SUSPECT_DESC', /(description|signalement|vetu|habille|vetement|cheveux|ressemble|corpulence|decrivez.{0,30}(agresseur|individu|suspect|homme|femme|auteur|personne|voleur))/],
  ['WEAPON', /\b(armes?|couteau|fusil|pistolet|arme a feu|objet dangereux)\b/],
  ['DIRECTION', /(parti|partis|direction|s enfui|fuite|a pied|encore sur place|toujours la)/],
  ['PLATE', /(plaque|immatricul)/],
  ['VEHICLE_TYPE', /(marque|modele|type de (vehicule|voiture)|quel (vehicule|genre de (vehicule|voiture))|quelle (voiture|moto)|quel scooter|c est une quoi|genre de voiture)/],
  ['VEHICLE_COLOR', /couleur/],
  ['STOLEN_ITEMS', /(qu est ce (qu|qui).{0,25}(pris|vole|manque|emporte|disparu)|(ce qu|ce qui).{0,25}(pris|vole|manque|emporte|disparu)|objets? (vole|pris|emporte)|butin|valeur|montant|a t on (pris|vole)|a t il (pris|vole|emporte)|ont ils (pris|vole|emporte)|que vous a t.{0,10}(pris|vole))/],
  ['KNOWS_SUSPECT', /(connaissez|connait il|reconnaitr|deja vu|connu de vous|lien (avec|entre))/],
  ['ENTRY', /(par ou (sont|est|il|ils|elle).{0,15}(entre|rentre|passe)|(sont|est) (il|ils|elle) (entre|rentre)|effraction|porte forcee|serrure)/],
  ['INSIDE', /((encore|toujours) (a l interieur|dedans|chez vous|dans (la|le|l|votre))|a l interieur|quelqu un (dedans|dans (la|le|l))|dans la voiture|personne dedans|etes vous seul|seule? chez vous)/],
  ['CHILDREN', /(enfants?|mineurs?|bebe|gamins?)/],
  ['ALCOHOL', /(alcool|\bbu\b|ivre|alcoolise|drogue|stupefiant|sous l emprise|\bsoul\b|bourre)/],
  ['TRAPPED', /(coince|incarcere|desincarc|piege)/],
  ['HAZARD', /(danger|fumee|carburant|essence|explos|\bfeu\b|flammes|fuite de (carburant|essence|gaz|liquide)|risque|\bgaz\b)/],
  ['REASSURE', /(restez (calme|en ligne|a l abri|chez vous|ou vous etes|en securite)|ne bougez|ne sortez|mettez vous (a l abri|en securite)|enfermez|verrouillez|respirez|calmez vous|patrouille|equipage|on envoie|nous envoyons|engag|les secours arrivent|on arrive|tout va bien se passer|je reste avec vous|ne raccrochez pas|je comprends)/],
];
const GREETING = /(bonjour|bonsoir|allo|police secours|j ecoute)/;

/** Sujets détectés dans la saisie libre de l'opérateur. */
export function detectTopics(text: string): Topic[] {
  const t = norm(text);
  const found = PATTERNS.filter(([, re]) => re.test(t)).map(([topic]) => topic);
  if (found.length === 0) return GREETING.test(t) ? ['WHAT'] : ['UNKNOWN'];
  return found;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Réponse « maison » d'un sujet de base (identité, victimes, nombre d'auteurs…) ; '' si le sujet n'en a pas. */
function baseAnswer(rng: Rng, topic: Topic, t: CallTruth): string {
  switch (topic) {
    case 'ADDRESS':
      return pick(rng, [`C'est au ${t.address}.`, `${cap(t.landmark)}, au ${t.address}.`, `Je suis ${t.landmark}, au ${t.address}.`]);
    case 'NAME':
      return pick(rng, [`${t.callerFirstName} ${t.callerLastName}.`, `Je m'appelle ${t.callerFirstName} ${t.callerLastName}.`, `${t.callerLastName}, ${t.callerFirstName}.`]);
    case 'PHONE':
      return pick(rng, [`Mon numéro, c'est le ${t.callerPhone}.`, `Vous pouvez me joindre au ${t.callerPhone}.`, `C'est le ${t.callerPhone}.`]);
    case 'WHAT':
      return pick(rng, [t.details, `${t.details} Voilà, c'est tout ce que je sais.`]);
    case 'HOW':
      return t.details;
    case 'VICTIMS':
      if (t.injuries)
        return t.victims > 1
          ? pick(rng, [`Oui, ${t.victims} personnes sont blessées.`, 'Il y a plusieurs blessés, du sang partout...'])
          : pick(rng, ['Oui, quelqu\'un est blessé.', 'Il y a du sang, une personne est blessée.']);
      return t.victims > 0
        ? `Pas de blessé grave, mais ${t.victims} personne${t.victims > 1 ? 's sont touchées' : ' est touchée'}.`
        : pick(rng, ["Non, personne n'est blessé.", 'Pas de blessé, heureusement.']);
    case 'SUSPECT_COUNT':
      if (t.suspects === 0) return pick(rng, ["Il n'y a pas d'auteur, pas que je sache.", "Personne d'autre, non."]);
      return t.suspects === 1
        ? pick(rng, ['Il est seul, je crois.', 'Un seul individu.'])
        : pick(rng, [`Ils sont ${t.suspects}.`, `Je dirais ${t.suspects} personnes.`]);
    case 'SUSPECT_DESC':
      return t.suspects > 0 ? `${cap(t.suspectDescription)}.` : 'Je ne vois personne à décrire.';
    case 'WEAPON':
      return t.weapons
        ? pick(rng, [`Oui ! Il y a ${t.weapons}.`, `Je crois que j'ai vu ${t.weapons}.`])
        : pick(rng, ["Non, je n'ai pas vu d'arme.", "Pas d'arme, non."]);
    case 'DIRECTION':
      return t.suspects > 0 ? t.suspectDirection : "Il n'y a personne qui soit parti.";
    default:
      return '';
  }
}

/** Réponses quand l'appelant ne sait pas, par sujet. */
const UNKNOWN: Partial<Record<Topic, string[]>> = {
  SUSPECT_DESC: ["Je n'ai pas vu son visage, tout est allé trop vite.", 'Je ne saurais pas le décrire, désolé.', "Il avait la tête cachée, je n'ai rien vu."],
  DIRECTION: ["Je ne sais pas où il est parti, je ne l'ai pas suivi.", "Je ne l'ai pas vu partir."],
  WEAPON: ["Je n'ai pas fait attention, je ne sais pas s'il avait une arme."],
  PLATE: ["Je n'ai pas vu la plaque, désolé.", "Non, je n'ai pas noté la plaque.", "Je n'ai pas pensé à regarder la plaque."],
  VEHICLE_TYPE: ["Je ne m'y connais pas en voitures.", "Je n'ai pas fait attention à la marque."],
  VEHICLE_COLOR: ["Je n'ai pas fait attention à la couleur."],
  INJURY_DETAIL: ['Je ne sais pas, je ne suis pas médecin.', "Je n'ose pas m'approcher pour voir."],
  CONSCIOUS: ["Je ne sais pas, je n'ose pas y toucher."],
  AGE: ['Je ne saurais pas dire.'],
  STOLEN_ITEMS: ['Je ne sais pas encore ce qui manque.'],
  KNOWS_SUSPECT: ["Non, je ne sais pas qui c'est."],
  ENTRY: ["Je n'ai pas vérifié."],
  INSIDE: ['Je ne sais pas, je ne peux pas voir.'],
  HAZARD: ["Je ne sais pas, je n'ose pas m'approcher."],
  TRAPPED: ['Je ne sais pas, je ne vois pas bien.'],
  HOW: ["Je n'ai pas tout vu, je suis arrivé après."],
  WHEN: ['Je ne sais plus exactement.'],
};
const UNKNOWN_ANY = ['Je ne sais pas.', "Je n'en sais rien."];

/** Réponses quand le sujet ne concerne pas cet appel (pas de véhicule, pas d'enfant, pas de blessé…). */
const NOT_CONCERNED: Partial<Record<Topic, string>> = {
  VEHICLE_TYPE: "Il n'y a pas de véhicule dans cette histoire.",
  VEHICLE_COLOR: "Il n'y a pas de véhicule dans cette histoire.",
  PLATE: "Il n'y a pas de véhicule dans cette histoire.",
  STOLEN_ITEMS: "On ne m'a rien pris.",
  KNOWS_SUSPECT: 'Non, pas que je sache.',
  ENTRY: "Il n'y a pas eu d'effraction.",
  INSIDE: "Non, il n'y a personne.",
  CHILDREN: "Non, pas d'enfant.",
  ALCOHOL: 'Pas que je sache.',
  HAZARD: 'Non, rien de dangereux.',
  TRAPPED: "Non, personne n'est coincé.",
  INJURY_DETAIL: "Il n'y a pas de blessé.",
  CONSCIOUS: "Il n'y a pas de blessé.",
  AGE: 'Je ne vois pas le rapport.',
};

interface TopicAnswer {
  text: string;
  /** L'appelant ne sait pas (ou à moitié) : la réponse n'apaise pas. */
  unknown: boolean;
  /** L'appelant se souvient enfin : pas de « je vous l'ai déjà dit ». */
  recalled: boolean;
}

/** Réponse à un détail demandé, selon ce que l'appelant sait (`facts`) ; une bribe peut devenir complète si on insiste. */
function answerTopic(rng: Rng, topic: Topic, t: CallTruth, times: number): TopicAnswer {
  const fact = t.facts[topic as FactKey];
  if (!fact) {
    const base = baseAnswer(rng, topic, t);
    return { text: base || NOT_CONCERNED[topic] || pick(rng, UNKNOWN_ANY), unknown: false, recalled: false };
  }
  const full = fact.value || baseAnswer(rng, topic, t);
  if (fact.knowledge === 'FULL') return { text: full, unknown: false, recalled: false };
  if (fact.knowledge === 'PARTIAL') {
    if (times > 0 && chance(rng, 0.4)) return { text: `Attendez, ça me revient : ${full}`, unknown: false, recalled: true };
    return { text: fact.partial ?? pick(rng, UNKNOWN[topic] ?? UNKNOWN_ANY), unknown: true, recalled: false };
  }
  return { text: fact.unknown ?? pick(rng, UNKNOWN[topic] ?? UNKNOWN_ANY), unknown: true, recalled: false };
}

const PANIC_FILLERS = ['Venez vite, je vous en supplie !', 'Je ne sais pas, je ne sais pas !', "J'ai trop peur, faites quelque chose !"];
const REFUSALS = ['Je préfère ne pas donner ça.', 'Pourquoi vous avez besoin de ça ?', 'Je ne veux pas être mêlé à ça.'];
const REASSURED = {
  CALME: ["D'accord, merci.", 'Très bien, j\'attends.'],
  PANIQUE: ["Oui... oui... d'accord.", "Dépêchez-vous, s'il vous plaît..."],
  EVASIF: ["Bon, d'accord.", "Hum, si vous le dites."],
} as const;

export function createProceduralCaller(rng: Rng = Math.random): CallerEngine {
  return {
    opening: (call) => call.truth.opening,

    async reply(active, operatorText) {
      const t = active.call.truth;
      const topics = detectTopics(operatorText);

      if (topics.includes('RUDE'))
        return { text: pick(rng, ['Ne me parlez pas sur ce ton !', 'Mais enfin, je fais ce que je peux !', 'Vous êtes désagréable !']), stressDelta: 25, topics: ['RUDE'], end: null };
      if (topics.includes('CLOSE'))
        return { text: pick(rng, ['Merci, au revoir.', "D'accord, merci. Au revoir.", 'Merci, bonne journée.']), stressDelta: 0, topics: ['CLOSE'], end: 'FIN' };

      const parts: string[] = [];
      const answered: Topic[] = [];
      let stressDelta = 0;

      // Quatre sujets au plus ; rassurer l'appelant compte toujours, même en fin de phrase.
      const handled = [...topics.filter((x) => x !== 'REASSURE').slice(0, 4), ...topics.filter((x) => x === 'REASSURE')];
      for (const topic of handled) {
        const times = active.topics[topic] ?? 0;
        if (topic === 'UNKNOWN') {
          parts.push(pick(rng, ["Pardon ? Je n'ai pas compris.", 'Je ne sais pas quoi vous répondre...', 'Vous pouvez répéter ?']));
          stressDelta += 4;
        } else if (topic === 'REASSURE') {
          parts.push(pick(rng, REASSURED[t.personality]));
          stressDelta -= 12;
          answered.push(topic);
        } else if (t.personality === 'EVASIF' && (topic === 'NAME' || topic === 'PHONE') && times === 0 && chance(rng, 0.75)) {
          parts.push(pick(rng, REFUSALS));
          stressDelta += 3;
          answered.push(topic);
        } else if (t.personality === 'PANIQUE' && active.stress >= 70 && chance(rng, 0.35)) {
          parts.push(pick(rng, PANIC_FILLERS));
          stressDelta += 3;
        } else {
          const a = answerTopic(rng, topic, t, times);
          if (times > 0 && !a.recalled) {
            parts.push(pick(rng, ["Je vous l'ai déjà dit. ", 'Je viens de vous le dire. ']) + a.text);
            stressDelta += 6;
          } else {
            parts.push(a.text);
            // Ne pas savoir inquiète un appelant paniqué, mais n'agace pas les autres.
            stressDelta += a.unknown ? (t.personality === 'PANIQUE' ? 2 : 0) : -2;
          }
          answered.push(topic);
        }
      }

      const flavour = t.personality === 'PANIQUE' && chance(rng, 0.5) ? `${pick(rng, ['Vite !', "Mon Dieu...", "J'ai peur !"])} ` : '';
      return { text: flavour + [...new Set(parts)].join(' '), stressDelta: Math.max(-15, stressDelta), topics: answered, end: null };
    },
  };
}

/** Moteur utilisé par le jeu. */
export const callerEngine: CallerEngine = createProceduralCaller();
