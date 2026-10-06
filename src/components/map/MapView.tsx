import 'leaflet/dist/leaflet.css';
import { memo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { brigades, type Brigade } from '../../data/brigades';
import { UNIT_STATUS_META } from '../../data/statuses';
import { remainingPath } from '../../lib/route';
import { useGameStore } from '../../store/gameStore';
import type { Coordinates } from '../../types';
import { brigadeIcon, incidentIcon, unitIcon } from './mapIcons';

/** Val-d'Oise (95) entier. */
const MAP_CENTER: [number, number] = [49.07, 2.17];
const MAP_ZOOM = 10;

/** Tracé restant : liseré sombre + trait orange pour rester lisible sur le fond de carte. */
function RoutePath({ path }: { path: Coordinates[] }) {
  return (
    <>
      <Polyline positions={path} pathOptions={{ color: '#0f172a', weight: 7, opacity: 0.7 }} />
      <Polyline positions={path} pathOptions={{ color: '#fb923c', weight: 3.5, opacity: 0.95 }} />
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
            <div className="text-slate-500">{site[0].address}</div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
});

function PlaceOnClick({ incidentId }: { incidentId: string }) {
  const place = useGameStore((s) => s.placeIncident);
  useMapEvents({ click: (e) => place(incidentId, { lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export function MapView() {
  const { units, incidents, service, selectedIncidentId } = useGameStore();
  const select = useGameStore((s) => s.selectIncident);

  const open = Object.values(incidents).filter((i) => i.zone === service && i.status !== 'RESOLVED' && i.status !== 'FAILED');
  const mine = Object.values(units).filter((u) => u.service === service);
  const selected = selectedIncidentId ? incidents[selectedIncidentId] : undefined;
  const toPlace = selected && !selected.coordinates && open.includes(selected) ? selected : undefined;

  return (
    <div className="relative h-full">
      <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full bg-slate-950">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
          className="dark-tiles"
        />
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
          <Marker key={u.id} position={u.position} icon={unitIcon(u)}>
            <Tooltip direction="top" offset={[0, -18]}>{u.callsign} · {UNIT_STATUS_META[u.status].label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {toPlace && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded bg-yellow-400 px-3 py-1.5 font-mono text-xs font-semibold text-yellow-950 shadow">
          {toPlace.id} non géolocalisée : cliquez sur la carte pour la placer
        </div>
      )}
    </div>
  );
}
