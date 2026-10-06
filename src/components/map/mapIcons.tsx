import { Bike, Car, Dog, Landmark, Shield } from 'lucide-react';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GravityLevel, Unit, UnitStatus, UnitType } from '../../types';

export const STATUS_COLOR: Record<UnitStatus, string> = {
  DISPO_ON_ZONE: '#10b981',
  DISPO_POSTE: '#6ee7b7',
  EN_ROUTE: '#f97316',
  SUR_LES_LIEUX: '#ef4444',
  EN_TRANSPORT: '#8b5cf6',
  INDISPONIBLE: '#64748b',
  URGENCE_RADIO: '#b91c1c',
};

const GRAVITY_COLOR: Record<GravityLevel, string> = { 5: '#dc2626', 4: '#f97316', 3: '#facc15', 2: '#0ea5e9', 1: '#64748b' };

const UNIT_GLYPH: Partial<Record<UnitType, typeof Car>> = {
  MOTOCYCLISTES: Bike, BMO: Bike, CANINE: Dog, BRI: Shield, GIGN: Shield,
};

// Les icônes Leaflet sont mises en cache pour ne pas être recréées à chaque tick.
const cache = new Map<string, L.DivIcon>();
function cached(key: string, html: string, size: [number, number], anchor: [number, number]) {
  let i = cache.get(key);
  if (!i) cache.set(key, (i = L.divIcon({ className: key.startsWith('u:') ? 'unit-marker' : '', html, iconSize: size, iconAnchor: anchor })));
  return i;
}

/** Pastille ronde (pictogramme du véhicule, couleur = statut) + indicatif. */
export function unitIcon(u: Pick<Unit, 'callsign' | 'type' | 'status'>, selected = false) {
  const color = STATUS_COLOR[u.status];
  const Glyph = UNIT_GLYPH[u.type] ?? Car;
  const glyph = renderToStaticMarkup(<Glyph size={16} color="#fff" strokeWidth={2.4} />);
  const pulse = u.status === 'EN_ROUTE' || u.status === 'URGENCE_RADIO' ? `<span class="absolute inset-0 animate-ping rounded-full" style="background:${color};opacity:.55"></span>` : '';
  const html = `<div class="flex flex-col items-center">
    <div class="relative grid size-8 place-items-center">${pulse}
      <span class="relative grid size-8 place-items-center rounded-full border-2 ${selected ? 'scale-125 border-yellow-300 ring-4 ring-yellow-300/60' : 'border-white'} shadow-lg shadow-black/60" style="background:${color}">${glyph}</span>
    </div>
    <span class="mt-0.5 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/90 px-2 font-mono text-[10px] font-semibold leading-4 text-white shadow">${u.callsign}</span>
  </div>`;
  return cached(`u:${u.callsign}:${u.type}:${u.status}:${selected}`, html, [150, 50], [75, 16]);
}

/** Brigade de gendarmerie : écusson bleu nuit, plus grand que les patrouilles pour rester repérable. */
export function brigadeIcon() {
  const glyph = renderToStaticMarkup(<Landmark size={15} color="#fff" strokeWidth={2.2} />);
  const html = `<span class="grid size-7 place-items-center rounded-md border-2 border-white bg-blue-900 shadow-lg shadow-black/60 ring-2 ring-blue-500/50">${glyph}</span>`;
  return cached('b', html, [28, 28], [14, 14]);
}

/** Épingle de localisation, couleur et numéro = gravité ; pulsation pour les urgences non engagées. */
export function incidentIcon(gravity: GravityLevel, selected: boolean, urgent: boolean) {
  const color = GRAVITY_COLOR[gravity];
  const text = gravity === 3 ? '#422006' : '#fff';
  const pulse = urgent ? `<span class="absolute left-1/2 top-[3px] size-8 -translate-x-1/2 animate-ping rounded-full" style="background:${color};opacity:.5"></span>` : '';
  const html = `<div class="relative h-11 w-9 origin-bottom transition-transform ${selected ? 'scale-125' : ''}" style="${selected ? 'filter:drop-shadow(0 0 6px #fff)' : 'filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))'}">
    ${pulse}
    <svg viewBox="0 0 36 44" class="relative size-full">
      <path d="M18 43C18 43 3 27.5 3 16.5a15 15 0 0 1 30 0C33 27.5 18 43 18 43Z" fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="18" cy="16.5" r="9.5" fill="rgba(0,0,0,.22)"/>
      <text x="18" y="21.5" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" font-weight="700" fill="${text}">${gravity}</text>
    </svg>
  </div>`;
  return cached(`i:${gravity}:${selected}:${urgent}`, html, [36, 44], [18, 43]);
}
