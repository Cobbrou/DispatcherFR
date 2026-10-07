import { useEffect, useState } from 'react';
import { suggestBan } from './ban';

/** Propositions de la BAN pour la saisie, 300 ms après la dernière frappe ; vide si trop court ou service injoignable. */
export function useBanSuggestions(input: string): string[] {
  const [found, setFound] = useState<{ q: string; list: string[] }>({ q: '', list: [] });
  const q = input.trim();
  useEffect(() => {
    if (q.length < 3) return;
    const ctl = new AbortController();
    const t = setTimeout(() => suggestBan(q, ctl.signal).then((list) => setFound({ q, list }), () => {}), 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);
  // Une réponse pour une saisie périmée n'est pas montrée.
  return found.q === q ? found.list : [];
}
