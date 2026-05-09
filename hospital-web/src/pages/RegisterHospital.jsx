import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, ArrowLeft, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Custom Map click handler
const LocationSelector = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

// Geolocation initial center handler
const InitialCenter = ({ setPosition }) => {
  const map = useMap();
  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map, setPosition]);
  return null;
}

function RegisterHospital() {
  const [name, setName] = useState('');
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !position) {
      setError('Please provide a hospital name and select a location on the map.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('hospitals')
        .insert([
          {
            name,
            latitude: position.lat,
            longitude: position.lng,
          }
        ]);

      if (dbError) throw dbError;

      alert('Hospital registered successfully!');
      navigate('/');
    } catch (err) {
      console.error('Error registering hospital:', err);
      setError(err.message || 'Failed to register hospital.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={32} color="#FF2D55" />
          <h1>LifeLink <span style={{ color: '#8E8E93', fontWeight: 400 }}>Hospital Registration</span></h1>
        </div>
        <Link to="/" style={{ color: '#8E8E93', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </header>

      <main style={{ overflowY: 'auto', flex: 1 }}>
        <div className="registration-container">
          <div style={{ width: '100%', marginBottom: '32px', textAlign: 'center' }}>
            <h2>Register New Facility</h2>
            <p style={{ color: '#8E8E93' }}>Add your hospital to the LifeLink network to receive real-time emergency SOS alerts from your vicinity.</p>
          </div>

          {error && (
            <div style={{ width: '100%', padding: '16px', backgroundColor: 'rgba(255, 45, 85, 0.1)', color: '#FF2D55', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(255, 45, 85, 0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ width: '100%' }}>
            <div className="form-group">
              <label>Hospital/Facility Name</label>
              <input 
                type="text" 
                placeholder="e.g. City General Hospital" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> Location (Click on the map to place a pin)
              </label>
              <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #2C2C2E', marginTop: '8px' }}>
                <MapContainer 
                  center={[28.6139, 77.2090]} // Default to New Delhi
                  zoom={12} 
                  style={{ width: '100%', height: '100%', background: '#1C1C1E' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    attribution='&copy; CARTO'
                  />
                  <LocationSelector position={position} setPosition={setPosition} />
                  <InitialCenter setPosition={setPosition} />
                </MapContainer>
              </div>
              {position && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#8E8E93' }}>
                  Selected Coordinates: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Registering...' : 'Register Hospital'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default RegisterHospital;
