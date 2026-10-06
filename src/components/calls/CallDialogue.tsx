import { useEffect, useRef, useState } from 'react';
import { callerTone } from '../../data/ui';
import { useGameStore } from '../../store/gameStore';
import type { TranscriptLine } from '../../types';

const STYLE: Record<TranscriptLine['from'], string> = {
  APPELANT: 'text-amber-300',
  OPERATEUR: 'text-sky-300',
  SYSTEME: 'italic text-red-400',
};
const LABEL: Record<TranscriptLine['from'], string> = { APPELANT: 'Appelant', OPERATEUR: 'Vous', SYSTEME: '' };

export function CallDialogue() {
  const active = useGameStore((s) => s.activeCall);
  const say = useGameStore((s) => s.say);
  const hangUp = useGameStore((s) => s.hangUp);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lines = active?.transcript.length;
  const pending = active?.pending;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
    inputRef.current?.focus();
  }, [lines, pending]);

  if (!active) return null;
  const ended = active.endReason !== null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void say(text);
    setText('');
  };

  return (
    <div className="flex h-full flex-col p-3 text-sm">
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-slate-400">
        <span>{active.call.callerPhoneNumber}</span>
        <span className={active.stress >= 70 ? 'text-red-400' : ''}>Ton : {callerTone(active.stress)}</span>
      </div>
      <ul role="log" aria-live="polite" aria-label="Conversation avec l'appelant" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {active.transcript.map((l, i) => (
          <li key={i} className={STYLE[l.from]}>
            {LABEL[l.from] && <span className="font-mono text-[11px] uppercase text-slate-400">{LABEL[l.from]} : </span>}
            {l.text}
          </li>
        ))}
        {active.pending && <li className="text-slate-400">…</li>}
        <div ref={endRef} />
      </ul>
      {ended ? (
        <p className="mt-2 font-mono text-xs text-slate-400">Appel terminé. Complétez ou abandonnez la fiche.</p>
      ) : (
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={active.pending}
            placeholder="Vous parlez à l'appelant…"
            className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1.5 outline-none focus:border-sky-400"
          />
          <button type="submit" disabled={active.pending || !text.trim()} className="rounded bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-600 disabled:opacity-40">
            Envoyer
          </button>
          <button type="button" onClick={() => window.confirm("Raccrocher ? L'appelant ne pourra plus répondre.") && hangUp()} className="rounded bg-slate-700 px-3 py-1.5 hover:bg-slate-600">
            Raccrocher
          </button>
        </form>
      )}
    </div>
  );
}
