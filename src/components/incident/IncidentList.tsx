import { INCIDENT_STATUS_LABEL } from '../../data/statuses';
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

  const rows = Object.values(incidents)
    .filter((i) => i.zone === service)
    .sort((a, b) => b.gravity - a.gravity || a.createdTimestamp - b.createdTimestamp);

  return (
    <Panel title="Main courante" right={<span>{rows.length} fiches</span>} className="flex-1 border-b-0">
      <ul>
        {rows.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => select(i.id)}
              className={`w-full border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-800 ${
                i.id === selectedId ? 'bg-slate-800' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <GravityBadge gravity={i.gravity} />
                <span className="truncate text-sm font-medium">{i.category}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{i.address}</div>
              <div className="mt-0.5 flex justify-between font-mono text-[11px] text-slate-500">
                <span>{i.id}</span>
                <span>
                  {INCIDENT_STATUS_LABEL[i.status]} · {formatElapsed(i.createdTimestamp, now)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
