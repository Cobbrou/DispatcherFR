import { lazy, memo, Suspense, useRef, useState, type ReactNode, type Ref } from 'react';
import { effectiveTimeScale } from '../../core/flow';
import { salleOf } from '../../data/radio';
import { SPEEDS } from '../../data/ui';
import { isMuted, setMuted } from '../../lib/audio';
import { formatClock } from '../../lib/format';
import { useShortcuts } from '../../lib/useShortcuts';
import { useSounds } from '../../lib/useSounds';
import { useGameStore } from '../../store/gameStore';
import { useLayoutStore, type PanelId } from '../../store/layoutStore';
import { CallPanel } from '../calls/CallPanel';
import { FicheWindow } from '../incident/FicheWindow';
import { IncidentDetail } from '../incident/IncidentDetail';
import { IncidentList } from '../incident/IncidentList';
import { UnitList } from '../units/UnitList';
import { LayoutMenu } from './LayoutMenu';
import { RadioLog } from './RadioLog';
import { ReportModal } from './ReportModal';
import { Splitter } from './Splitter';

// Leaflet et ses icônes ne se chargent qu'à l'ouverture du poste.
const MapView = lazy(() => import('../map/MapView').then((m) => ({ default: m.MapView })));

/** Seule à lire `now` (4 fois par seconde) : le reste du poste ne se re-rend pas à chaque tick. */
const Clock = memo(function Clock() {
  const now = useGameStore((s) => s.now);
  return <span className="w-20 text-right">{formatClock(now)}</span>;
});

const COLUMN = 'clamp(260px,24vw,380px)';
const GUTTER = '6px';

/** Emplacement d'un panneau : hauteur imposée, ou tout l'espace restant. */
function Slot({ height, ref, children }: { height?: string; ref?: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div ref={ref} style={height ? { height } : undefined} className={`flex min-h-0 flex-col ${height ? 'shrink-0' : 'flex-1'}`}>
      {children}
    </div>
  );
}

export function Cockpit() {
  const service = useGameStore((s) => s.service);
  const paused = useGameStore((s) => s.paused);
  const timeScale = useGameStore((s) => s.timeScale);
  const clamped = useGameStore((s) => effectiveTimeScale(s) !== s.timeScale);
  const offline = useGameStore((s) => s.offline);
  const togglePause = useGameStore((s) => s.togglePause);
  const setTimeScale = useGameStore((s) => s.setTimeScale);
  const [report, setReport] = useState(false);
  const [sound, setSound] = useState(() => !isMuted());
  const layout = useLayoutStore();
  const callActive = useGameStore((s) => !!s.activeCall);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const callsRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<HTMLDivElement>(null);
  const radioRef = useRef<HTMLDivElement>(null);
  useShortcuts();
  useSounds();

  const shown = (id: PanelId) => !layout.hidden.includes(id);
  const leftOn = shown('calls') || shown('incidents');
  const rightOn = shown('units') || shown('detail');
  const px = (n: number | null, fallback: string) => (n === null ? fallback : `${n}px`);
  // ponytail: bornes calculées au rendu ; une fenêtre réduite ensuite peut écraser la carte, « Réinitialiser » y remédie.
  const maxColumn = Math.round(window.innerWidth * 0.4);

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
          <button
            onClick={() => {
              setMuted(sound);
              setSound(!sound);
            }}
            aria-pressed={sound}
            title="Sonnerie, radio et alertes"
            className={`rounded px-2 py-0.5 text-xs ${sound ? 'bg-sky-700' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Son
          </button>
          <button onClick={() => setReport(true)} className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">Bilan</button>
          <LayoutMenu />
          <Clock />
        </span>
      </header>
      {notices.map((n) => (
        <div key={n.text} role="status" className={`px-4 py-1 text-center font-mono text-xs font-semibold ${n.style}`}>{n.text}</div>
      ))}
      <main
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: `${leftOn ? `${px(layout.left, COLUMN)} ${GUTTER} ` : ''}minmax(0,1fr)${rightOn ? ` ${GUTTER} ${px(layout.right, COLUMN)}` : ''}` }}
      >
        {leftOn && (
          <>
            <div ref={leftRef} className="flex min-h-0 flex-col">
              {shown('calls') && (
                <Slot ref={callsRef} height={shown('incidents') ? `${callActive ? 70 : layout.callsPct}%` : undefined}>
                  <CallPanel />
                </Slot>
              )}
              {shown('calls') && shown('incidents') && !callActive && (
                <Splitter target={callsRef} axis="y" percent min={15} max={85} label="Hauteur des appels" onChange={(callsPct) => layout.resize({ callsPct })} />
              )}
              {shown('incidents') && (
                <Slot>
                  <IncidentList />
                </Slot>
              )}
            </div>
            <Splitter target={leftRef} axis="x" min={200} max={maxColumn} label="Largeur de la colonne de gauche" onChange={(left) => layout.resize({ left })} />
          </>
        )}
        <div className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 isolate">
              <Suspense fallback={<p className="p-3 text-sm text-slate-400">Chargement de la carte…</p>}>
                <MapView />
              </Suspense>
            </div>
            <FicheWindow />
          </div>
          {shown('radio') && (
            <>
              <Splitter target={radioRef} axis="y" reverse min={60} max={480} label="Hauteur de la radio" onChange={(radio) => layout.resize({ radio })} />
              <Slot ref={radioRef} height={`${layout.radio}px`}>
                <RadioLog />
              </Slot>
            </>
          )}
        </div>
        {rightOn && (
          <>
            <Splitter target={rightRef} axis="x" reverse min={200} max={maxColumn} label="Largeur de la colonne de droite" onChange={(right) => layout.resize({ right })} />
            <div ref={rightRef} className="flex min-h-0 flex-col">
              {shown('units') && (
                <Slot ref={unitsRef} height={shown('detail') ? `${layout.unitsPct}%` : undefined}>
                  <UnitList />
                </Slot>
              )}
              {shown('units') && shown('detail') && (
                <Splitter target={unitsRef} axis="y" percent min={15} max={85} label="Hauteur des unités" onChange={(unitsPct) => layout.resize({ unitsPct })} />
              )}
              {shown('detail') && (
                <Slot>
                  <IncidentDetail />
                </Slot>
              )}
            </div>
          </>
        )}
      </main>
      {report && <ReportModal onClose={() => setReport(false)} />}
    </div>
  );
}
