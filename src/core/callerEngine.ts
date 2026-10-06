import { chance, pick, type Rng } from '../lib/rng';
import type { ActiveCall, CallTruth, IncomingCall } from '../types';

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
  | 'ADDRESS' | 'NAME' | 'PHONE' | 'WHAT' | 'VICTIMS' | 'SUSPECT_COUNT' | 'SUSPECT_DESC'
  | 'WEAPON' | 'DIRECTION' | 'REASSURE' | 'RUDE' | 'CLOSE' | 'UNKNOWN';

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
  ['VICTIMS', /(blesse|victime|saigne|\bsang\b|conscient|\brespire\b|inconscient|besoin (des secours|des pompiers|du samu|d une ambulance)|mal quelque part)/],
  ['SUSPECT_COUNT', /(combien (sont|etaient|d individus|de personnes|d agresseurs)|nombre de personnes|ils sont|sont ils|plusieurs|seul ou|auteurs|individus|agresseurs)/],
  ['SUSPECT_DESC', /(description|signalement|vetu|habille|vetement|cheveux|ressemble|corpulence|decrivez.{0,30}(agresseur|individu|suspect|homme|femme|auteur|personne|voleur))/],
  ['WEAPON', /\b(armes?|couteau|fusil|pistolet|arme a feu|objet dangereux)\b/],
  ['DIRECTION', /(parti|partis|direction|s enfui|fuite|vehicule|voiture|plaque|a pied|encore sur place|toujours la)/],
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

function factAnswer(rng: Rng, topic: Topic, t: CallTruth): string {
  switch (topic) {
    case 'ADDRESS':
      return pick(rng, [`C'est au ${t.address}.`, `${cap(t.landmark)}, au ${t.address}.`, `Je suis ${t.landmark}, au ${t.address}.`]);
    case 'NAME':
      return pick(rng, [`${t.callerFirstName} ${t.callerLastName}.`, `Je m'appelle ${t.callerFirstName} ${t.callerLastName}.`, `${t.callerLastName}, ${t.callerFirstName}.`]);
    case 'PHONE':
      return pick(rng, [`Mon numéro, c'est le ${t.callerPhone}.`, `Vous pouvez me joindre au ${t.callerPhone}.`, `C'est le ${t.callerPhone}.`]);
    case 'WHAT':
      return pick(rng, [t.details, `${t.details} Voilà, c'est tout ce que je sais.`]);
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

      // Trois sujets au plus ; rassurer l'appelant compte toujours, même en fin de phrase.
      const handled = [...topics.filter((x) => x !== 'REASSURE').slice(0, 3), ...topics.filter((x) => x === 'REASSURE')];
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
          const answer = factAnswer(rng, topic, t);
          if (times > 0) {
            parts.push(pick(rng, ["Je vous l'ai déjà dit. ", 'Je viens de vous le dire. ']) + answer);
            stressDelta += 6;
          } else {
            parts.push(answer);
            stressDelta -= 2;
          }
          answered.push(topic);
        }
      }

      const flavour = t.personality === 'PANIQUE' && chance(rng, 0.5) ? `${pick(rng, ['Vite !', "Mon Dieu...", "J'ai peur !"])} ` : '';
      return { text: flavour + parts.join(' '), stressDelta: Math.max(-15, stressDelta), topics: answered, end: null };
    },
  };
}

/** Moteur utilisé par le jeu. */
export const callerEngine: CallerEngine = createProceduralCaller();
