import { Phone } from 'lucide-react';
import { CALL_ABANDON_MIN } from '../../core/flow';
import { formatWait } from '../../lib/format';
import { useGameStore } from '../../store/gameStore';
import { Panel } from '../layout/Panel';
import { CallDialogue } from './CallDialogue';

/** Attente d'un appel : seule à suivre l'horloge, pour que le panneau ne se re-rende pas à chaque tick. */
function Wait({ since }: { since: number }) {
  const waited = useGameStore((s) => s.now - since);
  return <span className={`font-mono text-xs ${waited > 0.7 * CALL_ABANDON_MIN * 60_000 ? 'text-red-400' : 'text-slate-400'}`}>{formatWait(waited)}</span>;
}

export function CallPanel() {
  const queue = useGameStore((s) => s.callQueue);
  const active = useGameStore((s) => s.activeCall);
  const answer = useGameStore((s) => s.answerCall);
  const addCall = useGameStore((s) => s.addIncomingCall);

  return (
    <Panel
      title={active ? 'Appel en cours' : 'Ligne 17'}
      right={<span>{queue.length} en attente</span>}
      className="flex-1"
    >
      {active ? (
        <CallDialogue />
      ) : (
        <>
          {queue.length === 0 && <p className="p-3 text-sm text-slate-400">Aucun appel en attente.</p>}
          <ul>
            {queue.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-b border-slate-800 px-3 py-2">
                <Phone className="h-4 w-4 shrink-0 animate-pulse text-emerald-400" />
                <span className="min-w-0 flex-1 font-mono text-sm">{c.callerPhoneNumber}</span>
                <Wait since={c.receivedAt} />
                <button
                  onClick={() => answer(c.id)}
                  className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Décrocher
                </button>
              </li>
            ))}
          </ul>
          {import.meta.env.DEV && (
            <button onClick={addCall} className="m-3 rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
              + Appel entrant (test)
            </button>
          )}
        </>
      )}
    </Panel>
  );
}
