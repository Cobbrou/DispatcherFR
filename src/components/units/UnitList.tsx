import { useEffect } from 'react';
import { canUnit } from '../../core/statusMachine';
import { UNIT_STATUS_META, UNIT_TYPE_LABEL } from '../../data/statuses';
import { distanceM } from '../../lib/geo';
import { formatDistance } from '../../lib/format';
import { estimateEtaMs, routeDurationMs } from '../../lib/route';
import { useGameStore } from '../../store/gameStore';
import type { Unit } from '../../types';
import { Panel } from '../layout/Panel';
import { Badge } from '../ui/Badge';

const minutes = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min`;

/** Ligne d'info : distance et ETA estimés pour une unité libre, temps restant (ou « calcul… ») pour une unité en route. */
function eta(u: Unit, target: { lat: number; lng: number } | null | undefined, canEngage: boolean): string | null {
  if (u.status === 'EN_ROUTE') return u.route ? `arrivée dans ${minutes(routeDurationMs(u.route) - u.routeElapsedMs)}` : 'calcul de l’itinéraire…';
  if (!canEngage || !target) return null;
  const d = distanceM(u.position, target);
  return `${formatDistance(d)} · ~${minutes(estimateEtaMs(d))}`;
}

export function UnitList() {
  const units = useGameStore((s) => s.units);
  const service = useGameStore((s) => s.service);
  const selected = useGameStore((s) => (s.selectedIncidentId ? s.incidents[s.selectedIncidentId] : undefined));
  const selectedUnitId = useGameStore((s) => s.selectedUnitId);
  const assign = useGameStore((s) => s.assignUnit);
  const unassign = useGameStore((s) => s.unassignUnit);
  const selectUnit = useGameStore((s) => s.selectUnit);
  const setAvailability = useGameStore((s) => s.setAvailability);

  const open = !!selected && selected.status !== 'RESOLVED' && selected.status !== 'FAILED';
  const target = open ? selected.coordinates : null;
  const engageable = (u: Unit) => open && canUnit(u.status, 'EN_ROUTE');

  // Sélection venue de la carte : la ligne revient dans la zone visible.
  useEffect(() => {
    if (selectedUnitId) document.getElementById(`unit-${selectedUnitId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedUnitId]);

  // Unités libres d'abord, les plus proches de la fiche sélectionnée en tête ; puis les autres par indicatif.
  const dist = (u: Unit) => (target ? distanceM(u.position, target) : 0);
  const rows = Object.values(units)
    .filter((u) => u.service === service)
    .sort((a, b) => Number(engageable(b)) - Number(engageable(a)) || (engageable(a) ? dist(a) - dist(b) : 0) || a.callsign.localeCompare(b.callsign));

  const hint = !open ? 'Sélectionnez une fiche ouverte pour engager des unités.' : !target ? 'Fiche non géolocalisée : placez-la sur la carte pour engager des unités.' : null;

  return (
    <Panel title="Unités" right={<span>{rows.length}</span>} className="h-1/2">
      {hint && <p className="border-b border-slate-800 px-3 py-2 text-xs text-slate-400">{hint}</p>}
      <ul>
        {rows.map((u) => {
          const info = eta(u, target, engageable(u));
          return (
            <li key={u.id} id={`unit-${u.id}`} className={`flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 ${u.id === selectedUnitId ? 'bg-slate-800' : ''}`}>
              <button type="button" onClick={() => selectUnit(u.id)} aria-current={u.id === selectedUnitId ? 'true' : undefined} className="min-w-0 text-left">
                <div className="font-mono text-sm font-semibold">{u.callsign}</div>
                <div className="text-xs text-slate-400">
                  {UNIT_TYPE_LABEL[u.type]} · {u.officersCount} agent{u.officersCount > 1 ? 's' : ''}
                  {u.assignedIncidentId && <span className="font-mono"> · {u.assignedIncidentId}</span>}
                </div>
                {info && <div className="text-xs text-sky-300">{info}</div>}
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {engageable(u) && (
                  <button
                    onClick={() => assign(u.id, selected!.id)}
                    disabled={!target}
                    title={target ? `Engager sur ${selected!.id}` : 'Placez d’abord la fiche sur la carte'}
                    className="rounded bg-sky-700 px-2 py-0.5 text-xs font-semibold hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    Engager
                  </button>
                )}
                {(u.status === 'INDISPONIBLE' || canUnit(u.status, 'INDISPONIBLE')) && (
                  <button
                    onClick={() => setAvailability(u.id, u.status === 'INDISPONIBLE')}
                    title={u.status === 'INDISPONIBLE' ? 'Remettre en service' : 'Relève, repas, rédaction : l’unité ne peut plus être engagée'}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs hover:bg-slate-600"
                  >
                    {u.status === 'INDISPONIBLE' ? 'Reprendre' : 'Indispo'}
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
          );
        })}
      </ul>
    </Panel>
  );
}
