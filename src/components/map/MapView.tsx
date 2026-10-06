import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { UNIT_STATUS_META } from '../../data/statuses';
import { remainingPath } from '../../lib/route';
import { useGameStore } from '../../store/gameStore';
import type { Coordinates } from '../../types';
import { incidentIcon, unitIcon } from './mapIcons';

/** Tracé restant : liseré sombre + trait orange pour rester lisible sur le fond de carte. */
function RoutePath({ path }: { path: Coordinates[] }) {
  return (
    <>
      <Polyline positions={path} pathOptions={{ color: '#0f172a', weight: 7, opacity: 0.7 }} />
      <Polyline positions={path} pathOptions={{ color: '#fb923c', weight: 3.5, opacity: 0.95 }} />
    </>
  );
}

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
      <MapContainer center={service === 'POLICE' ? [48.5395, 2.66] : [48.52, 2.62]} zoom={13} className="h-full w-full bg-slate-950">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
          className="dark-tiles"
        />
        {toPlace && <PlaceOnClick incidentId={toPlace.id} />}

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
