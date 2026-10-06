import { useEffect, useState } from 'react';
import { INCIDENT_STATUS_LABEL, OUTCOME_LABEL } from '../../data/statuses';
import { formatElapsed } from '../../lib/format';
import { useGameStore } from '../../store/gameStore';
import { Panel } from '../layout/Panel';
import { GravityBadge } from './GravityBadge';

export function IncidentList() {
  const incidents = useGameStore((s) => s.incidents);
  const service = useGameStore((s) => s.service);
  const now = useGameStore((s) => s.now);
  const selectedId = useGameStore((s) => s.selectedIncidentId);
  const select = useGameStore((s) => s.selectIncident);

  const [archive, setArchive] = useState(false);
  // Sélection venue de la carte ou d'une unité : la ligne revient dans la zone visible.
  useEffect(() => {
    if (selectedId) document.getElementById(`inc-${selectedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const mine = Object.values(incidents).filter((i) => i.zone === service);
  const isClosed = (i: (typeof mine)[number]) => i.status === 'RESOLVED' || i.status === 'FAILED';
  const archived = mine.filter(isClosed).length;
  // En cours : les plus graves d'abord. Archives : les plus récentes d'abord.
  const rows = archive
    ? mine.filter(isClosed).sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    : mine.filter((i) => !isClosed(i)).sort((a, b) => b.gravity - a.gravity || a.createdTimestamp - b.createdTimestamp);

  return (
    <Panel
      title="Main courante"
      right={
        <span className="flex gap-1">
          {([false, true] as const).map((a) => (
            <button key={String(a)} onClick={() => setArchive(a)} aria-pressed={archive === a} className={`rounded px-2 normal-case ${archive === a ? 'bg-sky-700 text-white' : 'hover:text-slate-200'}`}>
              {a ? `Archives (${archived})` : `En cours (${mine.length - archived})`}
            </button>
          ))}
        </span>
      }
      className="flex-1 border-b-0"
    >
      {rows.length === 0 && <p className="p-3 text-sm text-slate-400">{archive ? 'Aucune fiche clôturée.' : 'Aucune fiche en cours.'}</p>}
      <ul>
        {rows.map((i) => (
          <li key={i.id} id={`inc-${i.id}`} className="fade-in">
            <button
              onClick={() => select(i.id)}
              aria-current={i.id === selectedId ? 'true' : undefined}
              className={`w-full border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-800 ${
                i.id === selectedId ? 'bg-slate-800' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <GravityBadge gravity={i.gravity} />
                <span className="truncate text-sm font-medium">{i.category}</span>
                {!i.coordinates && !isClosed(i) && <span className="ml-auto shrink-0 rounded bg-yellow-400 px-1.5 font-mono text-[10px] font-bold text-yellow-950">À PLACER</span>}
                {i.pending && <span className="ml-auto shrink-0 animate-pulse rounded bg-red-600 px-1.5 font-mono text-[10px] font-bold">{i.pending.kind === 'RENFORT' ? 'RENFORT' : 'SECOURS'}</span>}
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{i.address}</div>
              <div className="mt-0.5 flex justify-between font-mono text-[11px] text-slate-400">
                <span>{i.id}</span>
                <span>
                  {i.outcome ? OUTCOME_LABEL[i.outcome] : INCIDENT_STATUS_LABEL[i.status]} · {formatElapsed(i.createdTimestamp, now)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
