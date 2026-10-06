import { canUnit } from '../../core/statusMachine';
import { UNIT_STATUS_META } from '../../data/statuses';
import { useGameStore } from '../../store/gameStore';
import { Panel } from '../layout/Panel';
import { Badge } from '../ui/Badge';

export function UnitList() {
  const units = useGameStore((s) => s.units);
  const service = useGameStore((s) => s.service);
  const selected = useGameStore((s) => (s.selectedIncidentId ? s.incidents[s.selectedIncidentId] : undefined));
  const assign = useGameStore((s) => s.assignUnit);
  const unassign = useGameStore((s) => s.unassignUnit);

  const open = selected && selected.status !== 'RESOLVED' && selected.status !== 'FAILED';

  const rows = Object.values(units).filter((u) => u.service === service);

  return (
    <Panel title="Unités" right={<span>{rows.length}</span>} className="h-1/2">
      <ul>
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold">{u.callsign}</div>
              <div className="text-xs text-slate-500">
                {u.type} · {u.officersCount} agents
                {u.assignedIncidentId && <span className="font-mono"> · {u.assignedIncidentId}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {open && canUnit(u.status, 'EN_ROUTE') && (
                <button
                  onClick={() => assign(u.id, selected.id)}
                  disabled={!selected.coordinates}
                  title={selected.coordinates ? `Engager sur ${selected.id}` : 'Placez d’abord la fiche sur la carte'}
                  className="rounded bg-sky-600 px-2 py-0.5 text-xs font-semibold hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  Engager
                </button>
              )}
              {u.status === 'EN_ROUTE' && (
                <button onClick={() => unassign(u.id)} className="rounded bg-slate-700 px-2 py-0.5 text-xs hover:bg-slate-600">
                  Rappeler
                </button>
              )}
              <Badge className={UNIT_STATUS_META[u.status].badge}>
                {UNIT_STATUS_META[u.status].code} {UNIT_STATUS_META[u.status].label}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
