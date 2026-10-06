import type { ConcoursService, IncidentOutcome, ServiceType } from '../types';

/** Nom de la salle : CIC en zone police, CORG en zone gendarmerie. */
export const salleOf = (zone: ServiceType) => (zone === 'POLICE' ? 'CIC' : 'CORG');

export const REINFORCEMENT_REASONS = [
  "l'individu refuse de coopérer et s'énerve",
  'trois individus supplémentaires sont arrivés sur place',
  'la situation dégénère, un attroupement se forme',
  "l'individu est agressif, nous sommes en sous-effectif",
  'un second protagoniste, pris de violence, nous prend à partie',
];

/** Message radio de fin d'intervention de l'unité qui libère la fiche. */
export const END_MESSAGE: Record<IncidentOutcome, (cs: string, salle: string) => string> = {
  INTERPELLE: (cs, salle) => `De ${cs} pour ${salle}, un individu interpellé, fin d'intervention, disponibles sur secteur.`,
  PACIFIE: (cs, salle) => `De ${cs} pour ${salle}, situation pacifiée, retour au calme, disponibles sur secteur.`,
  FAUSSE_ALERTE: (cs, salle) => `De ${cs} pour ${salle}, rien à signaler sur place, fausse alerte, disponibles sur secteur.`,
  FUITE: (cs, salle) => `De ${cs} pour ${salle}, les auteurs ont pris la fuite, disponibles sur secteur.`,
};

/** Services dont l'équipage peut demander le concours : formulations radio et libellés d'interface. */
export const CONCOURS: Record<ConcoursService, { reason: string; de: string; alerted: string; direct: string; button: string }> = {
  SAMU: { reason: 'une personne blessée sur place', de: 'du SAMU', alerted: 'SAMU (15) alerté', direct: 'le SAMU', button: 'le SAMU (15)' },
  pompiers: { reason: 'une personne blessée sur place', de: 'des sapeurs-pompiers', alerted: 'sapeurs-pompiers (18) alertés', direct: 'les sapeurs-pompiers', button: 'les pompiers (18)' },
  routes: { reason: 'la chaussée est encombrée, il faut baliser', de: 'du service des routes', alerted: 'service des routes alerté', direct: 'le service des routes', button: 'le service des routes' },
};
