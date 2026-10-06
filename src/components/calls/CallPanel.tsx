import { Phone } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Panel } from '../layout/Panel';
import { CallDialogue } from './CallDialogue';

export function CallPanel() {
  const queue = useGameStore((s) => s.callQueue);
  const active = useGameStore((s) => s.activeCall);
  const answer = useGameStore((s) => s.answerCall);
  const addCall = useGameStore((s) => s.addIncomingCall);

  return (
    <Panel
      title={active ? 'Appel en cours' : 'Ligne 17'}
      right={<span>{queue.length} en attente</span>}
      className={`shrink-0 ${active ? 'h-[70%]' : 'h-2/5'}`}
    >
      {active ? (
        <CallDialogue />
      ) : (
        <>
          {queue.length === 0 && <p className="p-3 text-sm text-slate-500">Aucun appel en attente.</p>}
          <ul>
            {queue.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-b border-slate-800 px-3 py-2">
                <Phone className="h-4 w-4 shrink-0 animate-pulse text-emerald-400" />
                <span className="min-w-0 flex-1 font-mono text-sm">{c.callerPhoneNumber}</span>
                <button
                  onClick={() => answer(c.id)}
                  className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Décrocher
                </button>
              </li>
            ))}
          </ul>
          <button onClick={addCall} className="m-3 rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
            + Appel entrant (test)
          </button>
        </>
      )}
    </Panel>
  );
}
