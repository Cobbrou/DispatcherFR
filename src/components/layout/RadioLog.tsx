import { useEffect, useRef } from 'react';
import { formatClock } from '../../lib/format';
import { useGameStore } from '../../store/gameStore';
import { Panel } from './Panel';

/** Transcription du fil radio ; le plus récent en bas. */
export function RadioLog() {
  const radio = useGameStore((s) => s.radio);
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [radio.length]);

  return (
    <Panel title="Radio" right={<span>{radio.length} messages</span>} className="h-40 border-b-0 border-t">
      {radio.length === 0 ? (
        <p className="p-3 text-sm text-slate-500">Silence radio.</p>
      ) : (
        <ol className="space-y-0.5 p-2 font-mono text-xs">
          {radio.map((m) => (
            <li key={m.id} className={`fade-in flex gap-2 ${m.urgent ? 'font-semibold text-red-400' : 'text-slate-300'}`}>
              <span className="shrink-0 text-slate-500">{formatClock(m.timestamp)}</span>
              <span>{m.text}</span>
            </li>
          ))}
          <li ref={end} />
        </ol>
      )}
    </Panel>
  );
}
