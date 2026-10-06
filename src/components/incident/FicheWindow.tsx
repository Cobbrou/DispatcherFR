import { isDraftValid } from '../../core/callEngine';
import { categories, categoryByLabel } from '../../data/categories';
import { GRAVITY_META } from '../../data/statuses';
import { suggestAddresses } from '../../lib/geocode';
import { useGameStore } from '../../store/gameStore';
import { GravityBadge } from './GravityBadge';

const INPUT = 'w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-sky-400';

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/** Fenêtre CAD : l'opérateur saisit lui-même toute la fiche. */
export function FicheWindow() {
  const active = useGameStore((s) => s.activeCall);
  const update = useGameStore((s) => s.updateDraft);
  const validate = useGameStore((s) => s.validateCall);
  const discard = useGameStore((s) => s.discardCall);
  if (!active) return null;

  const d = active.draft;
  const category = categoryByLabel.get(d.category);
  const valid = isDraftValid(d);

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-slate-900">
      <header className="flex items-center justify-between bg-slate-800 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
        <span>Nouvelle fiche d'intervention</span>
        <span>{active.endReason ? 'Appel terminé' : 'Appel en cours'}</span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto p-4">
        <Field label="Catégorie (glossaire) *" className="col-span-2">
          <input list="categories" value={d.category} onChange={(e) => update({ category: e.target.value })} placeholder="Commencez à taper : vol, tapage, accident…" className={INPUT} />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c.label} value={c.label}>niveau {c.level}</option>
            ))}
          </datalist>
          {category && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <GravityBadge gravity={category.level} />
              <span>{GRAVITY_META[category.level].label}</span>
            </div>
          )}
          {category?.definition && <p className="mt-1 text-xs text-slate-400">{category.definition}</p>}
          {d.category && !category && <p className="mt-1 text-xs text-amber-400">Catégorie absente du glossaire.</p>}
        </Field>

        <Field label="Nom du requérant"><input value={d.callerLastName} onChange={(e) => update({ callerLastName: e.target.value })} className={INPUT} /></Field>
        <Field label="Prénom"><input value={d.callerFirstName} onChange={(e) => update({ callerFirstName: e.target.value })} className={INPUT} /></Field>
        <Field label="Téléphone" className="col-span-2"><input value={d.callerPhone} onChange={(e) => update({ callerPhone: e.target.value })} className={INPUT} /></Field>

        <Field label="Adresse *">
          <input list="addresses" value={d.address} onChange={(e) => update({ address: e.target.value })} placeholder="N°, rue, commune" autoComplete="off" className={INPUT} />
          <datalist id="addresses">
            {suggestAddresses(d.address).map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>
        <Field label="Complément (étage, repère)"><input value={d.complement} onChange={(e) => update({ complement: e.target.value })} className={INPUT} /></Field>

        <Field label="Faits" className="col-span-2">
          <textarea value={d.description} onChange={(e) => update({ description: e.target.value })} rows={3} className={INPUT} />
        </Field>
      </div>

      <footer className="flex gap-2 border-t border-slate-700 bg-slate-950 p-3">
        <button onClick={validate} disabled={!valid} className="flex-1 rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-40">
          Valider la fiche
        </button>
        <button onClick={discard} className="rounded bg-slate-700 px-3 py-2 hover:bg-slate-600">Abandonner</button>
      </footer>
    </div>
  );
}
