import { useEffect } from 'react';
import { Cockpit } from './components/layout/Cockpit';
import { useGameStore } from './store/gameStore';

const TICK_MS = 250;

export default function App() {
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const t = performance.now();
      // Onglet en arrière-plan : on plafonne pour que les unités ne se téléportent pas.
      useGameStore.getState().tick(Math.min(t - last, 1000));
      last = t;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return <Cockpit />;
}
