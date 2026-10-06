import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatClock } from '../../lib/format';
import { CallPanel } from '../calls/CallPanel';
import { FicheWindow } from '../incident/FicheWindow';
import { IncidentDetail } from '../incident/IncidentDetail';
import { IncidentList } from '../incident/IncidentList';
import { MapView } from '../map/MapView';
import { UnitList } from '../units/UnitList';
import { RadioLog } from './RadioLog';
import { ReportModal } from './ReportModal';

export function Cockpit() {
  const service = useGameStore((s) => s.service);
  const now = useGameStore((s) => s.now);
  const paused = useGameStore((s) => s.paused);
  const timeScale = useGameStore((s) => s.timeScale);
  const togglePause = useGameStore((s) => s.togglePause);
  const setTimeScale = useGameStore((s) => s.setTimeScale);
  const [report, setReport] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-700 bg-slate-950 px-4 py-2 font-mono text-sm">
        <span className="font-bold tracking-widest">DISPATCH-17</span>
        <span className="text-slate-400">
          {service === 'POLICE' ? 'CIC – Police Nationale' : 'CORG – Gendarmerie Nationale'}
        </span>
        <span className="flex items-center gap-2">
          <button onClick={togglePause} className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">
            {paused ? 'Reprendre' : 'Pause'}
          </button>
          {[1, 10, 30].map((k) => (
            <button
              key={k}
              onClick={() => setTimeScale(k)}
              className={`rounded px-2 py-0.5 text-xs ${k === timeScale ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'}`}
            >
              ×{k}
            </button>
          ))}
          <button onClick={() => setReport(true)} className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">Bilan</button>
          <span className="w-20 text-right">{formatClock(now)}</span>
        </span>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-[380px_1fr_380px]">
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
        <div className="flex min-h-0 flex-col border-l border-slate-700">
          <UnitList />
          <IncidentDetail />
        </div>
      </main>
      {report && <ReportModal onClose={() => setReport(false)} />}
    </div>
  );
}
