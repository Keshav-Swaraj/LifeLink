import React, { useEffect } from 'react';
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

// Victim / emergency marker
const MemoizedMarker = React.memo(({ em, isActive }) => {
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

const MapWrapper = ({ emergencies, activeEmergencyId }) => {
  const activeEm = activeEmergencyId ? emergencies.find(e => e.id === activeEmergencyId) : null;
  const victimCoords = activeEm && activeEm.latitude !== 0 && activeEm.longitude !== 0
    ? { lat: activeEm.latitude, lng: activeEm.longitude }
    : defaultCenter;

  // Center map between victim and ambulance when both are known
  const mapCenter = (activeEm?.responder_lat && activeEm?.responder_lng)
    ? {
        lat: (activeEm.latitude + activeEm.responder_lat) / 2,
        lng: (activeEm.longitude + activeEm.responder_lng) / 2,
      }
    : victimCoords;

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

        {/* Live ambulance marker — moves in real time via Supabase Realtime */}
        {activeEm?.responder_lat && activeEm?.responder_lng && (
          <>
            <Marker
              position={[activeEm.responder_lat, activeEm.responder_lng]}
              icon={ambulanceIcon}
            />
            {/* Dashed route line: ambulance → victim */}
            <Polyline
              positions={[
                [activeEm.responder_lat, activeEm.responder_lng],
                [
                  activeEm.latitude === 0 ? defaultCenter.lat : activeEm.latitude,
                  activeEm.longitude === 0 ? defaultCenter.lng : activeEm.longitude,
                ],
              ]}
              pathOptions={{
                color: '#FF6B00',
                weight: 2,
                dashArray: '6 5',
                opacity: 0.8,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default React.memo(MapWrapper);
