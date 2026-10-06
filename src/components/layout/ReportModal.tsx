import { buildReport } from '../../core/scoring';
import { OUTCOME_LABEL } from '../../data/statuses';
import { useGameStore } from '../../store/gameStore';
import type { IncidentOutcome } from '../../types';

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n)} %`);

/** Bilan de la journée, recalculé à chaque ouverture depuis les fiches. */
export function ReportModal({ onClose }: { onClose: () => void }) {
  const incidents = useGameStore((s) => s.incidents);
  const abandoned = useGameStore((s) => s.abandonedCalls);
  const r = buildReport(Object.values(incidents), abandoned);

  const rows: [string, string][] = [
    ['Fiches closes', `${r.total - r.open} / ${r.total} (${r.open} en cours)`],
    ['Résolues / en échec', `${r.resolved} / ${r.failed}`],
    ['Temps de réponse moyen', r.avgResponseMin === null ? '—' : `${r.avgResponseMin.toFixed(1)} min`],
    ['Délais cibles tenus', pct(r.onTimePct)],
    ['Secours oubliés par la salle', String(r.neglected)],
    ['Appels abandonnés en attente', String(r.abandoned)],
    ['Sous-engagements / sur-engagements', `${r.underEngaged} / ${r.overEngaged}`],
    ['Gravité sous-évaluée', String(r.underRated)],
    ...(Object.entries(r.outcomes) as [IncidentOutcome, number][]).map(([k, n]): [string, string] => [OUTCOME_LABEL[k], String(n)]),
  ];

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/60" onClick={onClose}>
      <div className="w-[440px] rounded border border-slate-600 bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="bg-slate-800 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">Bilan de la journée</header>
        <div className="p-4">
          <div className="mb-4 text-center">
            <div className="font-mono text-4xl font-bold">{pct(r.satisfaction)}</div>
            <div className="text-xs text-slate-400">Satisfaction des administrés</div>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-400">{k}</dt>
                <dd className="text-right font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <footer className="border-t border-slate-700 p-3">
          <button onClick={onClose} className="w-full rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600">Fermer</button>
        </footer>
      </div>
    </div>
  );
}
