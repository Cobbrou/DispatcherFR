import { memo, useState } from 'react';
import { isDraftValid } from '../../core/callEngine';
import { categories, categoryByLabel } from '../../data/categories';
import { GRAVITY_META } from '../../data/statuses';
import { suggestAddresses } from '../../lib/geocode';
import { useBanSuggestions } from '../../lib/useBanSuggestions';
import { FICHE_FOCUS_ID } from '../../lib/useShortcuts';
import { useGameStore } from '../../store/gameStore';
import { GravityBadge } from './GravityBadge';

const INPUT = 'w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-sky-400';

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Adresses de la BAN d'abord (vraies rues et numéros), puis celles du gazetteer local ; doublons écartés, huit au plus. */
const mergeSuggestions = (ban: string[], local: string[]) => {
  const seen = new Set<string>();
  return [...ban, ...local].filter((a) => !seen.has(plain(a)) && seen.add(plain(a))).slice(0, 8);
};

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block font-mono text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/** Les 300 catégories du glossaire : statiques, reconstruites seulement au premier rendu. */
const CategoryOptions = memo(function CategoryOptions() {
  return (
    <datalist id="categories">
      {categories.map((c) => (
        <option key={c.label} value={c.label}>niveau {c.level}</option>
      ))}
    </datalist>
  );
});

/** Fenêtre CAD : l'opérateur saisit lui-même toute la fiche. */
export const FicheWindow = memo(function FicheWindow() {
  const active = useGameStore((s) => s.activeCall);
  const update = useGameStore((s) => s.updateDraft);
  const validate = useGameStore((s) => s.validateCall);
  const discard = useGameStore((s) => s.discardCall);
  // Réduite, la fiche laisse voir la carte (placer une fiche, suivre les unités) sans abandonner la saisie.
  const [reduced, setReduced] = useState(false);
  const ban = useBanSuggestions(active?.draft.address ?? '');
  if (!active) return null;

  const d = active.draft;
  const category = categoryByLabel.get(d.category);
  const valid = isDraftValid(d);
  // Avertit seulement quand aucune catégorie du glossaire ne commence par la saisie.
  const typed = plain(d.category);
  const unknownCategory = d.category !== '' && !category && !categories.some((c) => plain(c.label).startsWith(typed));
  const missing = !category ? 'Choisissez une catégorie du glossaire' : !d.address.trim() ? "Saisissez l'adresse" : '';
  const started = !!(d.category || d.address || d.description || d.callerLastName);

  const abandon = () => {
    if (!started && active.endReason) return discard();
    if (window.confirm('Abandonner la fiche en cours ? La saisie sera perdue.')) discard();
  };

  const status = active.endReason ? 'Appel terminé' : 'Appel en cours';
  const toggle = (
    <button type="button" onClick={() => setReduced((r) => !r)} aria-expanded={!reduced} className="rounded bg-slate-700 px-2 py-0.5 normal-case text-slate-100 hover:bg-slate-600">
      {reduced ? 'Agrandir' : 'Réduire'}
    </button>
  );

  if (reduced)
    return (
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-slate-800 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400 shadow">
        <span>Fiche en cours{d.category && ` · ${d.category}`}</span>
        <span className="flex items-center gap-3">
          <span>{status}</span>
          {toggle}
        </span>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        validate();
      }}
      className="absolute inset-0 z-10 flex flex-col bg-slate-900"
    >
      <header className="flex items-center justify-between bg-slate-800 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
        <span>Nouvelle fiche d'intervention</span>
        <span className="flex items-center gap-3">
          <span>{status}</span>
          {toggle}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto p-4">
        <Field label="Catégorie (glossaire) *" className="col-span-2">
          <input
            id={FICHE_FOCUS_ID}
            required
            list="categories"
            value={d.category}
            onChange={(e) => update({ category: e.target.value })}
            placeholder="Commencez à taper : vol, tapage, accident…"
            className={INPUT}
          />
          <CategoryOptions />
          {category && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <GravityBadge gravity={category.level} />
              <span>{GRAVITY_META[category.level].label}</span>
            </div>
          )}
          {category?.definition && <p className="mt-1 text-xs text-slate-400">{category.definition}</p>}
          {unknownCategory && <p className="mt-1 text-xs text-amber-400">Catégorie absente du glossaire.</p>}
        </Field>

        <Field label="Nom du requérant"><input value={d.callerLastName} onChange={(e) => update({ callerLastName: e.target.value })} className={INPUT} /></Field>
        <Field label="Prénom"><input value={d.callerFirstName} onChange={(e) => update({ callerFirstName: e.target.value })} className={INPUT} /></Field>
        <Field label="Téléphone" className="col-span-2"><input type="tel" value={d.callerPhone} onChange={(e) => update({ callerPhone: e.target.value })} className={INPUT} /></Field>

        <Field label="Adresse *">
          <input required list="addresses" value={d.address} onChange={(e) => update({ address: e.target.value })} placeholder="N°, rue, commune" autoComplete="off" className={INPUT} />
          <datalist id="addresses">
            {mergeSuggestions(ban, suggestAddresses(d.address)).map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>
        <Field label="Complément (étage, repère)"><input value={d.complement} onChange={(e) => update({ complement: e.target.value })} className={INPUT} /></Field>

        <Field label="Faits" className="col-span-2">
          <textarea value={d.description} onChange={(e) => update({ description: e.target.value })} rows={3} className={INPUT} />
        </Field>
      </div>

      <footer className="border-t border-slate-700 bg-slate-950 p-3">
        {missing && <p role="status" className="mb-2 text-xs text-amber-400">{missing} pour valider.</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={!valid} title="Ctrl+Entrée" className="flex-1 rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-40">
            Valider la fiche
          </button>
          <button type="button" onClick={abandon} className="rounded bg-slate-700 px-3 py-2 hover:bg-slate-600">Abandonner</button>
        </div>
      </footer>
    </form>
  );
});
