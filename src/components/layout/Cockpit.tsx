import { useState } from 'react';
import { effectiveTimeScale } from '../../core/flow';
import { salleOf } from '../../data/radio';
import { NARROW_PX, SPEEDS } from '../../data/ui';
import { formatClock } from '../../lib/format';
import { useShortcuts } from '../../lib/useShortcuts';
import { useGameStore } from '../../store/gameStore';
import { CallPanel } from '../calls/CallPanel';
import { FicheWindow } from '../incident/FicheWindow';
import { IncidentDetail } from '../incident/IncidentDetail';
import { IncidentList } from '../incident/IncidentList';
import { MapView } from '../map/MapView';
import { UnitList } from '../units/UnitList';
import { RadioLog } from './RadioLog';
import { ReportModal } from './ReportModal';

const COLUMN = 'clamp(260px,24vw,380px)';

export function Cockpit() {
  const service = useGameStore((s) => s.service);
  const now = useGameStore((s) => s.now);
  const paused = useGameStore((s) => s.paused);
  const timeScale = useGameStore((s) => s.timeScale);
  const clamped = useGameStore((s) => effectiveTimeScale(s) !== s.timeScale);
  const offline = useGameStore((s) => s.offline);
  const togglePause = useGameStore((s) => s.togglePause);
  const setTimeScale = useGameStore((s) => s.setTimeScale);
  const [report, setReport] = useState(false);
  // Sous ~1100 px la colonne des unités démarre repliée (la carte serait écrasée).
  const [unitsOpen, setUnitsOpen] = useState(() => window.innerWidth >= NARROW_PX);
  useShortcuts();

  const notices = [
    paused && { text: 'PAUSE : le temps est arrêté (Espace pour reprendre)', style: 'bg-yellow-400 text-yellow-950' },
    clamped && { text: `Appel en cours ou en attente : le temps passe en ×1 (vitesse choisie : ×${timeScale})`, style: 'bg-sky-700 text-white' },
    offline.route && { text: 'Cartographie injoignable : trajets estimés en ligne droite', style: 'bg-orange-700 text-white' },
    offline.ban && { text: 'Service d’adresses injoignable : les fiches ne sont pas géolocalisées avec précision', style: 'bg-orange-700 text-white' },
  ].filter((n): n is { text: string; style: string } => !!n);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-950 px-4 py-2 font-mono text-sm">
        <span className="font-bold tracking-widest">DISPATCH-17</span>
        <span className="truncate text-slate-400">
          {salleOf(service)} – {service === 'POLICE' ? 'Police Nationale' : "Gendarmerie Nationale · Val-d'Oise (95)"}
        </span>
        <span className="flex items-center gap-2">
          <button onClick={togglePause} aria-pressed={paused} title="Espace" className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">
            {paused ? 'Reprendre' : 'Pause'}
          </button>
          {SPEEDS.map((k, i) => (
            <button
              key={k}
              onClick={() => setTimeScale(k)}
              aria-pressed={k === timeScale}
              title={`Touche ${i + 1}`}
              className={`rounded px-2 py-0.5 text-xs ${k === timeScale ? 'bg-sky-700' : 'bg-slate-800 hover:bg-slate-700'}`}
            >
              ×{k}
            </button>
          ))}
          <button onClick={() => setReport(true)} className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">Bilan</button>
          <button
            onClick={() => setUnitsOpen((o) => !o)}
            aria-pressed={unitsOpen}
            title="Afficher ou replier la colonne des unités"
            className={`rounded px-2 py-0.5 text-xs ${unitsOpen ? 'bg-sky-700' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Unités
          </button>
          <span className="w-20 text-right">{formatClock(now)}</span>
        </span>
      </header>
      {notices.map((n) => (
        <div key={n.text} role="status" className={`px-4 py-1 text-center font-mono text-xs font-semibold ${n.style}`}>{n.text}</div>
      ))}
      <main className="grid min-h-0 flex-1" style={{ gridTemplateColumns: unitsOpen ? `${COLUMN} minmax(0,1fr) ${COLUMN}` : `${COLUMN} minmax(0,1fr)` }}>
        <div className="flex min-h-0 flex-col border-r border-slate-700">
          <CallPanel />
          <IncidentList />
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 isolate">
              <MapView />
            </div>
            <FicheWindow />
          </div>
          <RadioLog />
        </div>
        {unitsOpen && (
          <div className="flex min-h-0 flex-col border-l border-slate-700">
            <UnitList />
            <IncidentDetail />
          </div>
        )}
      </main>
      {report && <ReportModal onClose={() => setReport(false)} />}
    </div>
  );
}
