import type { ServiceType } from '../types';

export interface Street {
  name: string;
  commune: string;
  zone: ServiceType;
  lat: number;
  lng: number;
}

// Coordonnées approximatives : base de départ du prototype, pas un référentiel d'adresses.
export const streets: Street[] = [
  // Zone police (CIC) – Melun
  { name: 'rue Saint-Barthélemy', commune: 'Melun', zone: 'POLICE', lat: 48.5405, lng: 2.6602 },
  { name: 'avenue Thiers', commune: 'Melun', zone: 'POLICE', lat: 48.5368, lng: 2.6571 },
  { name: 'rue du Château', commune: 'Melun', zone: 'POLICE', lat: 48.5391, lng: 2.6644 },
  { name: 'place Praslin', commune: 'Melun', zone: 'POLICE', lat: 48.5399, lng: 2.659 },
  { name: 'rue Carnot', commune: 'Melun', zone: 'POLICE', lat: 48.538, lng: 2.656 },
  { name: 'boulevard Gambetta', commune: 'Melun', zone: 'POLICE', lat: 48.5357, lng: 2.6532 },
  { name: 'rue Paul Doumer', commune: 'Melun', zone: 'POLICE', lat: 48.5445, lng: 2.654 },
  { name: 'avenue du Général Leclerc', commune: 'Melun', zone: 'POLICE', lat: 48.543, lng: 2.67 },
  { name: 'rue Dajot', commune: 'Melun', zone: 'POLICE', lat: 48.5415, lng: 2.6615 },
  { name: "boulevard de l'Almont", commune: 'Melun', zone: 'POLICE', lat: 48.5337, lng: 2.6692 },
  // Zone gendarmerie (CORG)
  { name: 'avenue de la Libération', commune: 'Dammarie-lès-Lys', zone: 'GENDARMERIE', lat: 48.5123, lng: 2.639 },
  { name: 'rue de la République', commune: 'Dammarie-lès-Lys', zone: 'GENDARMERIE', lat: 48.5148, lng: 2.641 },
  { name: 'rue du Pont', commune: 'Dammarie-lès-Lys', zone: 'GENDARMERIE', lat: 48.5095, lng: 2.6335 },
  { name: 'rue des Écoles', commune: 'Boissise-le-Roi', zone: 'GENDARMERIE', lat: 48.5183, lng: 2.587 },
  { name: 'route de Corbeil', commune: 'Boissise-le-Roi', zone: 'GENDARMERIE', lat: 48.5155, lng: 2.5905 },
  { name: 'rue de la Mairie', commune: 'Seine-Port', zone: 'GENDARMERIE', lat: 48.5543, lng: 2.5733 },
];
