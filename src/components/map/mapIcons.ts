import L from 'leaflet';
import type { GravityLevel, Unit, UnitStatus, UnitType } from '../../types';

/** Pictogrammes lucide (ISC) en SVG statique : évite d'embarquer react-dom/server pour 5 glyphes. */
const GLYPH = {
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  dog: '<path d="M11.25 16.25h1.5L12 17z"/><path d="M16 14v.5"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309"/><path d="M8 14v.5"/><path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  landmark: '<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const glyph = (name: keyof typeof GLYPH, size: number, stroke: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${GLYPH[name]}</svg>`;

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

const UNIT_GLYPH: Partial<Record<UnitType, keyof typeof GLYPH>> = {
  MOTOCYCLISTES: 'bike', BMO: 'bike', CANINE: 'dog', BRI: 'shield', GIGN: 'shield',
};

// Les icônes Leaflet sont mises en cache pour ne pas être recréées à chaque tick.
const cache = new Map<string, L.DivIcon>();
function cached(key: string, html: () => string, size: [number, number], anchor: [number, number]) {
  let i = cache.get(key);
  if (!i) cache.set(key, (i = L.divIcon({ className: key.startsWith('u:') ? 'unit-marker' : '', html: html(), iconSize: size, iconAnchor: anchor })));
  return i;
}

/** Pastille ronde (pictogramme du véhicule, couleur = statut) + indicatif. */
export function unitIcon(u: Pick<Unit, 'callsign' | 'type' | 'status'>, selected = false) {
  const html = () => {
    const color = STATUS_COLOR[u.status];
    const pulse = u.status === 'EN_ROUTE' || u.status === 'URGENCE_RADIO' ? `<span class="absolute inset-0 animate-ping rounded-full" style="background:${color};opacity:.55"></span>` : '';
    return `<div class="flex flex-col items-center">
      <div class="relative grid size-8 place-items-center">${pulse}
        <span class="relative grid size-8 place-items-center rounded-full border-2 ${selected ? 'scale-125 border-yellow-300 ring-4 ring-yellow-300/60' : 'border-white'} shadow-lg shadow-black/60" style="background:${color}">${glyph(UNIT_GLYPH[u.type] ?? 'car', 16, 2.4)}</span>
      </div>
      <span class="mt-0.5 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/90 px-2 font-mono text-[10px] font-semibold leading-4 text-white shadow">${esc(u.callsign)}</span>
    </div>`;
  };
  return cached(`u:${u.callsign}:${u.type}:${u.status}:${selected}`, html, [150, 50], [75, 16]);
}

/** Brigade de gendarmerie : écusson bleu nuit, plus grand que les patrouilles pour rester repérable. */
export function brigadeIcon() {
  const html = () => `<span class="grid size-7 place-items-center rounded-md border-2 border-white bg-blue-900 shadow-lg shadow-black/60 ring-2 ring-blue-500/50">${glyph('landmark', 15, 2.2)}</span>`;
  return cached('b', html, [28, 28], [14, 14]);
}

/** Épingle de localisation, couleur et numéro = gravité ; pulsation pour les urgences non engagées. */
export function incidentIcon(gravity: GravityLevel, selected: boolean, urgent: boolean) {
  const html = () => {
    const color = GRAVITY_COLOR[gravity];
    const text = gravity === 3 ? '#422006' : '#fff';
    const pulse = urgent ? `<span class="absolute left-1/2 top-[3px] size-8 -translate-x-1/2 animate-ping rounded-full" style="background:${color};opacity:.5"></span>` : '';
    return `<div class="relative h-11 w-9 origin-bottom transition-transform ${selected ? 'scale-125' : ''}" style="${selected ? 'filter:drop-shadow(0 0 6px #fff)' : 'filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))'}">
      ${pulse}
      <svg viewBox="0 0 36 44" class="relative size-full">
        <path d="M18 43C18 43 3 27.5 3 16.5a15 15 0 0 1 30 0C33 27.5 18 43 18 43Z" fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="18" cy="16.5" r="9.5" fill="rgba(0,0,0,.22)"/>
        <text x="18" y="21.5" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" font-weight="700" fill="${text}">${gravity}</text>
      </svg>
    </div>`;
  };
  return cached(`i:${gravity}:${selected}:${urgent}`, html, [36, 44], [18, 43]);
}
