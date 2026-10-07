import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NARROW_PX } from '../data/ui';

/** Panneaux que l'opérateur peut afficher ou masquer (la carte reste toujours là). */
export const PANELS = {
  calls: 'Appels',
  incidents: 'Main courante',
  units: 'Unités',
  detail: 'Fiche sélectionnée',
  radio: 'Radio',
} as const;
export type PanelId = keyof typeof PANELS;

interface Sizes {
  /** Largeur des colonnes latérales (px) ; null = proportionnelle à l'écran. */
  left: number | null;
  right: number | null;
  /** Hauteur du fil radio (px). */
  radio: number;
  /** Part (%) de la colonne prise par les appels, puis par les unités, quand le panneau voisin est visible. */
  callsPct: number;
  unitsPct: number;
}

interface Layout extends Sizes {
  hidden: PanelId[];
  toggle: (id: PanelId) => void;
  resize: (patch: Partial<Sizes>) => void;
  reset: () => void;
}

// Sous ~1100 px, la colonne des unités démarre masquée (la carte serait écrasée).
const initial = (): Sizes & { hidden: PanelId[] } => ({
  hidden: typeof window !== 'undefined' && window.innerWidth < NARROW_PX ? ['units', 'detail'] : [],
  left: null,
  right: null,
  radio: 160,
  callsPct: 40,
  unitsPct: 50,
});

/** Disposition du poste, mémorisée dans le navigateur (localStorage). */
export const useLayoutStore = create<Layout>()(
  persist(
    (set) => ({
      ...initial(),
      toggle: (id) => set((s) => ({ hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] })),
      resize: (patch) => set(patch),
      reset: () => set(initial()),
    }),
    { name: 'dispatch17-layout', version: 1 },
  ),
);
