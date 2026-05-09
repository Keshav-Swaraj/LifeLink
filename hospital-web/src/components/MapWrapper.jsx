import { useEffect, useState, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = { lat: 28.6139, lng: 77.2090 };

// Custom animated ambulance icon
const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(10,10,15,0.9);
    border-radius: 50%;
    border: 2px solid #FF6B00;
    box-shadow: 0 0 14px rgba(255,107,0,0.6);
  ">🚑</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.9);
    border-radius: 50%;
    border: 2px solid #FF2D55;
    box-shadow: 0 0 15px rgba(255,45,85,0.6);
  ">🏥</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Smoothly pans map when center changes
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 14, { animate: true });
    }
  }, [center?.lat, center?.lng, map]);
  return null;
};

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Victim / emergency marker
const MemoizedMarker = memo(({ em, isActive }) => {
  const color = em.severity === 'red' ? '#FF2D55' : em.severity === 'orange' ? '#FF9500' : '#FFCC00';
  return (
    <CircleMarker
      center={[
        em.latitude === 0 ? defaultCenter.lat : em.latitude,
        em.longitude === 0 ? defaultCenter.lng : em.longitude,
      ]}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.85,
        weight: isActive ? 3 : 2,
        color: '#ffffff',
      }}
      radius={isActive ? 13 : 8}
    />
  );
}, (prev, next) =>
  prev.em.id === next.em.id &&
  prev.isActive === next.isActive &&
  prev.em.responder_lat === next.em.responder_lat
);

const MapWrapper = ({ emergencies, activeEmergencyId, hospital }) => {
  const activeEm = activeEmergencyId ? emergencies.find(e => e.id === activeEmergencyId) : null;
  const victimCoords = activeEm && activeEm.latitude !== 0 && activeEm.longitude !== 0
    ? { lat: activeEm.latitude, lng: activeEm.longitude }
    : hospital ? { lat: hospital.latitude, lng: hospital.longitude } : defaultCenter;

  // Center map between victim and hospital when active
  const mapCenter = (activeEm && hospital)
    ? {
        lat: (activeEm.latitude + hospital.latitude) / 2,
        lng: (activeEm.longitude + hospital.longitude) / 2,
      }
    : victimCoords;

  const mockAmbulances = hospital ? [
    { id: 'm1', lat: hospital.latitude + 0.005, lng: hospital.longitude + 0.005 },
    { id: 'm2', lat: hospital.latitude - 0.003, lng: hospital.longitude + 0.008 },
    { id: 'm3', lat: hospital.latitude + 0.006, lng: hospital.longitude - 0.004 },
  ] : [];

  const [routeCoords, setRouteCoords] = useState(null);

  useEffect(() => {
    if (activeEm && hospital && activeEm.latitude !== 0 && activeEm.longitude !== 0) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${hospital.longitude},${hospital.latitude};${activeEm.longitude},${activeEm.latitude}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            setRouteCoords(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
          } else {
            setRouteCoords(null);
          }
        } catch (err) {
          console.error("Failed to fetch route", err);
          setRouteCoords(null);
        }
      };
      fetchRoute();
    } else {
      setRouteCoords(null);
    }
  }, [activeEm?.id, hospital?.id, activeEm?.latitude, activeEm?.longitude, hospital?.latitude, hospital?.longitude]);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={13}
        style={{ width: '100%', height: '100%', background: '#1C1C1E' }}
        zoomControl={false}
      >
        {/* Dark basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController center={mapCenter} />
        <MapResizer />

        {/* All emergency victim markers */}
        {emergencies.map(em => (
          <MemoizedMarker
            key={em.id}
            em={em}
            isActive={em.id === activeEmergencyId}
          />
        ))}

        {/* 3km radius ring for active emergency */}
        {activeEm && (
          <Circle
            center={[
              activeEm.latitude === 0 ? defaultCenter.lat : activeEm.latitude,
              activeEm.longitude === 0 ? defaultCenter.lng : activeEm.longitude,
            ]}
            radius={3000}
            pathOptions={{
              fillColor: '#0A84FF',
              fillOpacity: 0.04,
              color: '#0A84FF',
              weight: 1,
              dashArray: '5 5',
            }}
          />
        )}

        {/* Hospital marker */}
        {hospital && (
          <Marker position={[hospital.latitude, hospital.longitude]} icon={hospitalIcon} />
        )}

        {/* Mock idle ambulances around hospital */}
        {mockAmbulances.map(amb => (
          <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={ambulanceIcon} />
        ))}

        {/* Live ambulance marker — moves in real time via Supabase Realtime */}
        {activeEm?.responder_lat && activeEm?.responder_lng && (
          <Marker
            position={[activeEm.responder_lat, activeEm.responder_lng]}
            icon={ambulanceIcon}
          />
        )}

        {/* Route line: hospital → victim when case is active */}
        {activeEm && hospital && activeEm.latitude !== 0 && activeEm.longitude !== 0 && (
          <Polyline
            positions={routeCoords || [
              [hospital.latitude, hospital.longitude],
              [activeEm.latitude, activeEm.longitude],
            ]}
            pathOptions={{
              color: '#0A84FF',
              weight: 4,
              dashArray: routeCoords ? undefined : '8 6',
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default memo(MapWrapper);
