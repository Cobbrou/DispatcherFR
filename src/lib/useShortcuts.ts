import { useEffect } from 'react';
import { SPEEDS } from '../data/ui';
import { useGameStore } from '../store/gameStore';

/** Id du champ « catégorie » de la fiche : F2 y met le focus. */
export const FICHE_FOCUS_ID = 'fiche-category';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/**
 * Raccourcis : Espace pause, 1/2/3 vitesses, F2 décrocher l'appel suivant ou revenir à la fiche,
 * Ctrl+Entrée valider la fiche, Échap désélectionner (la fenêtre de bilan gère son propre Échap).
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      if (e.key === 'F2') {
        e.preventDefault();
        if (s.activeCall) document.getElementById(FICHE_FOCUS_ID)?.focus();
        else if (s.callQueue[0]) s.answerCall(s.callQueue[0].id);
      } else if (e.key === 'Enter' && e.ctrlKey) {
        if (s.activeCall) {
          e.preventDefault();
          s.validateCall();
        }
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target) && !document.querySelector('dialog[open]')) {
        if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          s.togglePause();
        } else if (e.key >= '1' && e.key <= String(SPEEDS.length)) s.setTimeScale(SPEEDS[Number(e.key) - 1]);
        else if (e.key === 'Escape') s.selectIncident(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
