import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = { lat: 28.6139, lng: 77.2090 };

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 13, {
        animate: true,
      });
    }
  }, [center?.lat, center?.lng, map]);
  return null;
};

const MemoizedMarker = React.memo(({ em, isActive }) => {
  const color = em.severity === 'red' ? '#FF2D55' : em.severity === 'orange' ? '#FF9500' : '#FFCC00';
  return (
    <CircleMarker
      center={[(em.latitude === 0 ? defaultCenter.lat : em.latitude), (em.longitude === 0 ? defaultCenter.lng : em.longitude)]}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.8,
        weight: isActive ? 3 : 2,
        color: '#ffffff',
      }}
      radius={isActive ? 12 : 8}
    />
  );
}, (prev, next) => prev.em.id === next.em.id && prev.isActive === next.isActive);

const MemoizedActiveOverlay = React.memo(({ activeEm }) => {
  if (!activeEm) return null;
  return (
    <>
      <Circle 
        center={[(activeEm.latitude === 0 ? defaultCenter.lat : activeEm.latitude), (activeEm.longitude === 0 ? defaultCenter.lng : activeEm.longitude)]}
        radius={3000} // 3km in meters
        pathOptions={{ fillColor: '#0A84FF', fillOpacity: 0.05, color: '#0A84FF', weight: 1, dashArray: '4 4' }}
      />
    </>
  );
}, (prev, next) => prev.activeEm?.id === next.activeEm?.id && prev.activeEm?.latitude === next.activeEm?.latitude);

const MapWrapper = ({ emergencies, activeEmergencyId }) => {
  const activeEm = activeEmergencyId ? emergencies.find(e => e.id === activeEmergencyId) : null;
  const center = (activeEm && activeEm.latitude !== 0 && activeEm.longitude !== 0) ? { lat: activeEm.latitude, lng: activeEm.longitude } : defaultCenter;

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={12} 
        style={{ width: '100%', height: '100%', background: '#1C1C1E' }}
        zoomControl={false}
      >
        {/* Dark Matter Premium Tiles by CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController center={center} />

        {emergencies.map(em => (
          <MemoizedMarker 
            key={em.id} 
            em={em} 
            isActive={em.id === activeEmergencyId} 
          />
        ))}

        <MemoizedActiveOverlay activeEm={activeEm} />
      </MapContainer>
    </div>
  );
};

export default React.memo(MapWrapper);
