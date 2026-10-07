import 'leaflet/dist/leaflet.css';
import { memo, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { brigades, type Brigade } from '../../data/brigades';
import { UNIT_STATUS_META } from '../../data/statuses';
import { MAP_CENTER, MAP_FOCUS_ZOOM, MAP_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '../../data/ui';
import { remainingPath } from '../../lib/route';
import { useGameStore } from '../../store/gameStore';
import type { Coordinates } from '../../types';
import { brigadeIcon, incidentIcon, unitIcon } from './mapIcons';

const ROUTE_CASING = { color: '#0f172a', weight: 7, opacity: 0.7 };
const ROUTE_LINE = { color: '#fb923c', weight: 3.5, opacity: 0.95 };

/** Tracé restant : liseré sombre + trait orange pour rester lisible sur le fond de carte. */
function RoutePath({ path }: { path: Coordinates[] }) {
  return (
    <>
      <Polyline positions={path} pathOptions={ROUTE_CASING} />
      <Polyline positions={path} pathOptions={ROUTE_LINE} />
    </>
  );
}

// Une seule épingle par adresse (la BMO de Louvres partage la caserne de la brigade).
const brigadeSites = Object.values(
  brigades.reduce<Record<string, Brigade[]>>((acc, b) => ((acc[`${b.lat},${b.lng}`] ??= []).push(b), acc), {}),
);

/** Casernes du Val-d'Oise : statiques, jamais re-rendues par le tick. */
const BrigadeMarkers = memo(function BrigadeMarkers() {
  return (
    <>
      {brigadeSites.map((site) => (
        <Marker key={site[0].id} position={site[0]} icon={brigadeIcon()} zIndexOffset={-500}>
          <Tooltip direction="top" offset={[0, -12]}>
            {site.map((b) => <div key={b.id}>{b.name}</div>)}
            <div className="text-slate-400">{site[0].address}</div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
});

/** Recadre la carte à chaque nouvelle sélection (fiche ou unité), pas à chaque mouvement d'unité. */
function FlyToSelection() {
  const map = useMap();
  const incidentId = useGameStore((s) => s.selectedIncidentId);
  const unitId = useGameStore((s) => s.selectedUnitId);
  const prev = useRef({ incidentId, unitId });
  useEffect(() => {
    const before = prev.current;
    prev.current = { incidentId, unitId };
    const s = useGameStore.getState();
    // Une unité sélectionnée prime sur sa fiche ; la sélection initiale ne recadre pas.
    const target = unitId !== before.unitId && unitId ? s.units[unitId]?.position : incidentId !== before.incidentId && incidentId ? s.incidents[incidentId]?.coordinates : null;
    if (target) map.flyTo(target, Math.max(map.getZoom(), MAP_FOCUS_ZOOM), { duration: 0.6 });
  }, [map, incidentId, unitId]);
  return null;
}

/** Le conteneur change de taille (colonne repliée, bandeau d'état) sans que la fenêtre bouge : Leaflet doit le savoir. */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function PlaceOnClick({ incidentId }: { incidentId: string }) {
  const place = useGameStore((s) => s.placeIncident);
  useMapEvents({ click: (e) => place(incidentId, { lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export function MapView() {
  const units = useGameStore((s) => s.units);
  const incidents = useGameStore((s) => s.incidents);
  const service = useGameStore((s) => s.service);
  const selectedIncidentId = useGameStore((s) => s.selectedIncidentId);
  const selectedUnitId = useGameStore((s) => s.selectedUnitId);
  const [tilesDown, setTilesDown] = useState(false);
  const select = useGameStore((s) => s.selectIncident);
  const selectUnit = useGameStore((s) => s.selectUnit);

  const open = Object.values(incidents).filter((i) => i.zone === service && i.status !== 'RESOLVED' && i.status !== 'FAILED');
  const mine = Object.values(units).filter((u) => u.service === service);
  const selected = selectedIncidentId ? incidents[selectedIncidentId] : undefined;
  const toPlace = selected && !selected.coordinates && open.includes(selected) ? selected : undefined;

  return (
    <div className="relative h-full">
      <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full bg-slate-950">
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          className="dark-tiles"
          eventHandlers={{ tileerror: () => setTilesDown(true), tileload: () => setTilesDown(false) }}
        />
        <FlyToSelection />
        <ResizeWatcher />
        {toPlace && <PlaceOnClick incidentId={toPlace.id} />}

        {service === 'GENDARMERIE' && <BrigadeMarkers />}

        {mine.map((u) =>
          u.status === 'EN_ROUTE' && u.route ? (
            <RoutePath key={`route-${u.id}`} path={remainingPath(u.route, u.routeElapsedMs)} />
          ) : null,
        )}

        {open.map((i) =>
          i.coordinates ? (
            <Marker
              key={i.id}
              position={i.coordinates}
              icon={incidentIcon(i.gravity, i.id === selectedIncidentId, i.pending !== null || (i.gravity >= 4 && i.status === 'PENDING'))}
              zIndexOffset={500}
              eventHandlers={{ click: () => select(i.id) }}
            >
              <Tooltip direction="top" offset={[0, -40]}>{i.category}</Tooltip>
            </Marker>
          ) : null,
        )}

        {mine.map((u) => (
          <Marker key={u.id} position={u.position} icon={unitIcon(u, u.id === selectedUnitId)} zIndexOffset={u.id === selectedUnitId ? 1000 : 0} eventHandlers={{ click: () => selectUnit(u.id) }}>
            <Tooltip direction="top" offset={[0, -18]}>{u.callsign} · {UNIT_STATUS_META[u.status].label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {tilesDown && (
        <div role="status" className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2 rounded bg-orange-700 px-3 py-1.5 font-mono text-xs font-semibold text-white shadow">
          Fond de carte indisponible : les fiches et les unités restent exactes
        </div>
      )}

      {toPlace && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded bg-yellow-400 px-3 py-1.5 font-mono text-xs font-semibold text-yellow-950 shadow">
          {toPlace.id} non géolocalisée : cliquez sur la carte pour la placer
        </div>
      )}
    </div>
  );
}
