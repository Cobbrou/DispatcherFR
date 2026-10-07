import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PLAY, soundFor, unlockAudio } from './audio';

/** Joue les sons du poste (appel entrant, radio, alerte) ; le son est déverrouillé au premier clic ou à la première touche. */
export function useSounds() {
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    const unsubscribe = useGameStore.subscribe((next, prev) => {
      const sound = soundFor(prev, next);
      if (sound) PLAY[sound]();
    });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      unsubscribe();
    };
  }, []);
}
