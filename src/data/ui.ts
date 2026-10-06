/** Vitesses de jeu proposées (touches 1, 2, 3). */
export const SPEEDS = [1, 10, 30] as const;

/** Val-d'Oise (95) entier. */
export const MAP_CENTER: [number, number] = [49.07, 2.17];
export const MAP_ZOOM = 10;
/** Zoom d'approche quand on sélectionne une fiche ou une unité. */
export const MAP_FOCUS_ZOOM = 13;
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Largeur sous laquelle la colonne des unités démarre repliée. */
export const NARROW_PX = 1100;

/** Ton de la voix : seul indice visible de l'état de l'appelant. */
export const callerTone = (stress: number) => (stress < 35 ? 'Calme' : stress < 70 ? 'Tendu' : 'Paniqué');
