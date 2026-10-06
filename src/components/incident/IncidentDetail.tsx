import { INCIDENT_STATUS_LABEL, GRAVITY_META } from '../../data/statuses';
import { formatClock } from '../../lib/format';
import { useGameStore } from '../../store/gameStore';
import { Panel } from '../layout/Panel';
import { GravityBadge } from './GravityBadge';

export function IncidentDetail() {
  const incident = useGameStore((s) => (s.selectedIncidentId ? s.incidents[s.selectedIncidentId] : undefined));
  const units = useGameStore((s) => s.units);
  const close = useGameStore((s) => s.closeIncident);

  const rows: [string, string][] = incident
    ? [
        ['Gravité', `${incident.gravity} – ${GRAVITY_META[incident.gravity].label}`],
        ['Statut', INCIDENT_STATUS_LABEL[incident.status]],
        ['Requérant', [incident.callerFirstName, incident.callerLastName].filter(Boolean).join(' ') || '—'],
        ['Téléphone', incident.callerPhone || '—'],
        ['Unités engagées', incident.assignedUnits.map((id) => units[id]?.callsign ?? id).join(', ') || '—'],
      ]
    : [];

  return (
    <Panel title="Fiche d'intervention" right={<span>{incident?.id}</span>} className="h-1/2 border-b-0">
      {!incident ? (
        <p className="p-3 text-sm text-slate-500">Aucune fiche sélectionnée.</p>
      ) : (
        <div className="space-y-3 p-3 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <GravityBadge gravity={incident.gravity} />
              <h2 className="font-semibold">{incident.category}</h2>
            </div>
            <div className="mt-1 text-slate-300">
              {incident.address}
              {incident.complement && <span className="text-slate-500"> · {incident.complement}</span>}
            </div>
            <div className="font-mono text-xs text-slate-500">
              {incident.coordinates
                ? `${incident.coordinates.lat.toFixed(4)}, ${incident.coordinates.lng.toFixed(4)}`
                : 'Non géolocalisée'}
            </div>
            {incident.description && <p className="mt-2 text-slate-300">{incident.description}</p>}
          </div>

          {incident.status === 'PENDING' && (
            <button onClick={() => close(incident.id)} className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">
              Clôturer sans intervention
            </button>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-500">Journal</h3>
            <ol className="space-y-1 font-mono text-xs">
              {incident.logs.map((l, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="shrink-0 text-slate-500">{formatClock(l.timestamp)}</span>
                  <span className="shrink-0 text-sky-400">{l.author}</span>
                  <span className="text-slate-300">{l.message}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Panel>
  );
}
