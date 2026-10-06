import type { Coordinates } from '../types';

export interface Brigade {
  id: string;
  /** Préfixe des indicatifs : « LOUVRES » → LOUVRES.101, LOUVRES.102… */
  label: string;
  name: string;
  /** BTA : brigade territoriale ; BMO : brigade ou peloton motorisé. */
  kind: 'BTA' | 'BMO';
  address: string;
  lat: number;
  lng: number;
}

// Source : annuaire du service public (api-lannuaire.service-public.fr), unités de gendarmerie du Val-d'Oise.
export const brigades: Brigade[] = [
  { id: 'bta-95026', label: 'ASNIÈRES-SUR-OISE', name: 'Brigade de gendarmerie - Asnières-sur-Oise', kind: 'BTA', address: '1 route de Chantilly, 95270 Asnières-sur-Oise', lat: 49.1388, lng: 2.3739 },
  { id: 'bta-95039', label: 'AUVERS-SUR-OISE', name: 'Brigade de gendarmerie - Auvers-sur-Oise', kind: 'BTA', address: '31 rue François Mitterrand, 95430 Auvers-sur-Oise', lat: 49.0754, lng: 2.161 },
  { id: 'bmo-95052', label: 'BEAUMONT-SUR-OISE PMO', name: 'Peloton de gendarmerie motorisé - Beaumont-sur-Oise', kind: 'BMO', address: '7 rue Division-Leclerc, 95260 Beaumont-sur-Oise', lat: 49.1377, lng: 2.283 },
  { id: 'bta-95199', label: 'DOMONT', name: 'Brigade de gendarmerie - Domont', kind: 'BTA', address: '191 avenue Jean Rostand, 95330 Domont', lat: 49.0419, lng: 2.3376 },
  { id: 'bta-95205', label: 'ÉCOUEN', name: 'Brigade de gendarmerie - Écouen', kind: 'BTA', address: '79 rue du Maréchal Leclerc, 95440 Écouen', lat: 49.0227, lng: 2.3844 },
  { id: 'bta-95313', label: 'L\'ISLE-ADAM', name: 'Brigade de gendarmerie - l\'Isle-Adam', kind: 'BTA', address: '32 Grande Rue, 95290 L\'Isle Adam', lat: 49.1131, lng: 2.2207 },
  { id: 'bta-95351', label: 'LOUVRES', name: 'Brigade de gendarmerie - Louvres', kind: 'BTA', address: '2 route de la Grange aux Dîmes, 95380 Louvres', lat: 49.046, lng: 2.5138 },
  { id: 'bmo-95351', label: 'LOUVRES BMO', name: 'Brigade de gendarmerie motorisée - Louvres', kind: 'BMO', address: '2 route de la Grange aux Dîmes, 95380 Louvres', lat: 49.046, lng: 2.5138 },
  { id: 'bta-95352', label: 'LUZARCHES', name: 'Brigade de gendarmerie - Luzarches', kind: 'BTA', address: '37 rue Charles de Gaulle, 95270 Luzarches', lat: 49.1099, lng: 2.4226 },
  { id: 'bta-95355', label: 'MAGNY-EN-VEXIN', name: 'Brigade de gendarmerie - Magny-en-Vexin', kind: 'BTA', address: '26 rue de Crosne, 95420 Magny-en-Vexin', lat: 49.1509, lng: 1.7872 },
  { id: 'bta-95370', label: 'MARINES', name: 'Brigade de gendarmerie - Marines', kind: 'BTA', address: '3 chemin du Pont, 95640 Marines', lat: 49.1417, lng: 1.991 },
  { id: 'bta-95394', label: 'MÉRY-SUR-OISE', name: 'Brigade de gendarmerie - Méry-sur-Oise', kind: 'BTA', address: '4 avenue Marcel Perrin, 95540 Méry-sur-Oise', lat: 49.0666, lng: 2.1817 },
  { id: 'bta-95428', label: 'MONTMORENCY', name: 'Brigade de gendarmerie - Montmorency', kind: 'BTA', address: '2 rue des Gallerands, 95160 Montmorency', lat: 48.9901, lng: 2.3276 },
  { id: 'bta-95430', label: 'MONTSOULT', name: 'Brigade de gendarmerie - Montsoult', kind: 'BTA', address: 'Rue Parmentier, 95560 Montsoult', lat: 49.0675, lng: 2.3186 },
  { id: 'bta-95487', label: 'PERSAN', name: 'Brigade de gendarmerie - Persan', kind: 'BTA', address: '26 avenue Jean Jaurès, 95340 Persan', lat: 49.1377, lng: 2.2835 },
  { id: 'bta-95500', label: 'PONTOISE', name: 'Brigade de gendarmerie - Pontoise', kind: 'BTA', address: '5 boulevard de l\'Hautil, 95000 Pontoise', lat: 49.0372, lng: 2.0861 },
  { id: 'bmo-95500', label: 'PONTOISE BMO', name: 'Brigade de gendarmerie motorisée - Pontoise', kind: 'BMO', address: '90 rue de Gisors, 95000 Pontoise', lat: 49.058, lng: 2.0909 },
  { id: 'bta-95527', label: 'ROISSY-EN-FRANCE', name: 'Brigade de gendarmerie - Roissy-en-France', kind: 'BTA', address: '3 chemin de la Vallée, 95700 Roissy-en-France', lat: 49.0024, lng: 2.5092 },
  { id: 'bta-95604', label: 'SURVILLIERS', name: 'Brigade de gendarmerie - Survilliers', kind: 'BTA', address: '2 chemin de la Distillerie, 95470 Survilliers', lat: 49.0945, lng: 2.5447 },
  { id: 'bta-95658', label: 'VIGNY', name: 'Brigade de gendarmerie - Vigny', kind: 'BTA', address: '50 rue Beaudouin, 95450 Vigny', lat: 49.0789, lng: 1.922 },
];

/** Nombre de véhicules (VL) par brigade : numéros 101, 102, 103… */
const VEHICLES: Record<string, number> = { 'bta-95500': 3, 'bmo-95351': 1, 'bmo-95500': 1, 'bmo-95052': 1 };
export const vehiclesOf = (b: Brigade) => VEHICLES[b.id] ?? (b.kind === 'BMO' ? 1 : 2);

export const brigadeById = new Map(brigades.map((b) => [b.id, b]));
export const brigadePosition = (b: Brigade): Coordinates => ({ lat: b.lat, lng: b.lng });
