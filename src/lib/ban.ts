import type { Coordinates } from '../types';

/**
 * Géocode une adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr, sans clé) :
 * rue et numéro exacts. `null` si injoignable ou trop peu fiable.
 */
export async function geocodeBan(address: string): Promise<Coordinates | null> {
  try {
    // lat/lon : favorise les résultats autour de Melun en cas d'homonymes.
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1&lat=48.54&lon=2.66`;
    const f = (await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json()).features?.[0];
    if (!f || f.properties.score < 0.5) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}
