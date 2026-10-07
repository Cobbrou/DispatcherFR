import { PANELS, useLayoutStore, type PanelId } from '../../store/layoutStore';

/** Menu « Disposition » : panneaux à afficher, retour à la disposition d'origine. Les tailles se règlent en glissant les séparateurs. */
export function LayoutMenu() {
  const hidden = useLayoutStore((s) => s.hidden);
  const toggle = useLayoutStore((s) => s.toggle);
  const reset = useLayoutStore((s) => s.reset);

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700">Disposition</summary>
      <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-slate-600 bg-slate-900 p-2 text-xs shadow-lg">
        {(Object.keys(PANELS) as PanelId[]).map((id) => (
          <label key={id} className="flex cursor-pointer items-center gap-2 py-1">
            <input type="checkbox" checked={!hidden.includes(id)} onChange={() => toggle(id)} />
            {PANELS[id]}
          </label>
        ))}
        <p className="mt-1 border-t border-slate-700 pt-1 text-slate-400">Glissez les séparateurs (ou les flèches, une fois l'un d'eux sélectionné) pour redimensionner.</p>
        <button onClick={reset} className="mt-2 w-full rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Réinitialiser la disposition</button>
      </div>
    </details>
  );
}
