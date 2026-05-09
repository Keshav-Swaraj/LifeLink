import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Activity, Clock, MapPin, AlertTriangle, CheckCircle, Navigation, Ambulance } from 'lucide-react'
import { format } from 'date-fns'
import MapWrapper from '../components/MapWrapper'
import { Link } from 'react-router-dom'

function Dashboard() {
  const [emergencies, setEmergencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeEmergencyId, setActiveEmergencyId] = useState(null)
  const [hospital, setHospital] = useState(null)
  const [newEmergencyPopup, setNewEmergencyPopup] = useState(null)
  const [simulatingId, setSimulatingId] = useState(null)
  const activeSimulations = useRef({})
  const audioRef = useRef(null)

  async function fetchHospital() {
    try {
      const { data, error } = await supabase.from('hospitals').select('*').limit(1)
      if (data && data.length > 0) {
        setHospital(data[0])
      }
    } catch (err) {
      console.error('Fetch hospital error:', err)
    }
  }

  async function fetchActiveEmergencies() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setEmergencies(data || [])
      if (data && data.length > 0) setActiveEmergencyId(data[0].id)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveEmergencies()
    fetchHospital()

    // Subscribe to REALTIME updates
    const subscription = supabase
      .channel('hospital-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current => [payload.new, ...current])
        setActiveEmergencyId(payload.new.id)
        setNewEmergencyPopup(payload.new)
        // Play alert sound for new emergencies
        try {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play()
        } catch (e) {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current =>
          current.map(e => e.id === payload.new.id ? payload.new : e)
        )
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current => current.filter(e => e.id !== payload.old.id))
      })
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [])

  async function handleDispatch(id) {
    try {
      const updateData = { status: 'dispatched' }
      if (hospital) {
        updateData.responder_lat = hospital.latitude
        updateData.responder_lng = hospital.longitude
      }

      const { error } = await supabase
        .from('emergencies')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Dispatch error:', err)
      alert('Failed to dispatch: ' + err.message)
    }
  }

  async function handleResolve(id) {
    try {
      const { error } = await supabase
        .from('emergencies')
        .update({ status: 'resolved' })
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to resolve: ' + err.message)
    }
  }

  async function handleReject(id) {
    try {
      // Optimistic update
      setEmergencies(current => current.filter(e => e.id !== id))
      if (activeEmergencyId === id) setActiveEmergencyId(null)

      const { error } = await supabase
        .from('emergencies')
        .delete()
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to reject: ' + err.message)
      // Re-fetch to restore state if deletion failed
      fetchActiveEmergencies()
    }
  }

  async function startSimulation(em) {
    if (!em.latitude || !em.longitude || !em.responder_lat || !em.responder_lng) {
      alert("Missing coordinates for simulation!")
      return
    }
    setSimulatingId(em.id)

    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${em.responder_lng},${em.responder_lat};${em.longitude},${em.latitude}?overview=full&geometries=geojson`)
      const data = await res.json()
      if (!data.routes || data.routes.length === 0) return
      
      const coords = data.routes[0].geometry.coordinates // [lng, lat]
      let step = 0
      const stepSize = Math.max(1, Math.floor(coords.length / 20)) // ~20 steps
      
      if (activeSimulations.current[em.id]) clearInterval(activeSimulations.current[em.id])

      activeSimulations.current[em.id] = setInterval(async () => {
        step += stepSize
        if (step >= coords.length) {
          step = coords.length - 1
          clearInterval(activeSimulations.current[em.id])
          delete activeSimulations.current[em.id]
          setSimulatingId(null)
          
          await supabase.from('emergencies').update({ 
            status: 'arrived', 
            responder_lat: coords[step][1], 
            responder_lng: coords[step][0] 
          }).eq('id', em.id)
          return
        }
        
        await supabase.from('emergencies').update({
          responder_lat: coords[step][1],
          responder_lng: coords[step][0]
        }).eq('id', em.id)
      }, 2000)

    } catch (err) {
      console.error(err)
      setSimulatingId(null)
    }
  }

  const severityColors = { red: '#FF2D55', orange: '#FF9500', yellow: '#FFCC00', green: '#34C759', unknown: '#34C759' }
  const severityLabels = { red: 'CRITICAL', orange: 'MEDIUM RISK', yellow: 'SAFE', green: 'SAFE' }

  const activeCount = emergencies.filter(e => e.status !== 'resolved' && e.status !== 'rejected').length
  const redCount = emergencies.filter(e => e.severity === 'red' && e.status !== 'resolved').length
  const criticalNew = emergencies.find(e => e.severity === 'red' && e.status === 'pending')

  return (
    <div className="dashboard">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={32} color="#FF2D55" />
          <div>
            <h1 style={{ margin: 0 }}>LifeLink <span style={{ color: '#8E8E93', fontWeight: 400 }}>Hospital Monitor</span></h1>
            <div style={{ color: '#FF2D55', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px' }}>
              ● LIVE FEED
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/register" style={{ color: '#0A84FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Navigation size={18} />
            Register Hospital
          </Link>
          <div style={{ color: '#8E8E93', fontSize: '14px' }}>
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>

      {/* New Emergency Modal Popup */}
      {newEmergencyPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#1C1C1E', padding: '40px', borderRadius: '24px',
            border: `2px solid ${severityColors[newEmergencyPopup.severity] || '#34C759'}`,
            maxWidth: '500px', textAlign: 'center', boxShadow: '0 0 40px rgba(0,0,0,0.5)',
            animation: 'pulse 1s infinite'
          }}>
            <AlertTriangle size={64} color={severityColors[newEmergencyPopup.severity] || '#34C759'} style={{ marginBottom: '20px' }} />
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#FFF', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>🚨 NEW CASE DETECTED 🚨</h2>
            <div style={{ fontSize: '20px', color: '#AEAEB2', marginBottom: '16px', fontWeight: 700 }}>
              Severity: <span style={{ color: severityColors[newEmergencyPopup.severity] || '#34C759', fontWeight: 900 }}>{severityLabels[newEmergencyPopup.severity] || 'SAFE'}</span>
            </div>
            <div style={{ fontSize: '16px', color: '#E5E5EA', marginBottom: '30px', lineHeight: 1.6 }}>
              {newEmergencyPopup.ai_summary}
            </div>
            <button
              onClick={() => setNewEmergencyPopup(null)}
              style={{
                backgroundColor: '#0A84FF', color: '#FFF', border: 'none',
                padding: '16px 32px', borderRadius: '12px', fontSize: '18px',
                fontWeight: 800, cursor: 'pointer', width: '100%',
                boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)'
              }}
            >
              View Incident Details
            </button>
          </div>
        </div>
      )}

      {/* Critical alert flash banner */}
      {criticalNew && (
        <div style={{
          backgroundColor: '#FF2D55',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'pulse 1s infinite',
        }}>
          <AlertTriangle size={20} color="#FFF" />
          <span style={{ color: '#FFF', fontWeight: 800, fontSize: '14px' }}>
            🚨 NEW CRITICAL EMERGENCY — {criticalNew.address || 'Location captured'} — Immediate action required
          </span>
        </div>
      )}

      <main className="main-content">
        <div className="left-panel">
          <div className="stats-sidebar stats-horizontal">
            <div className="stat-item">
              <div className="stat-label">Total Incoming</div>
              <div className="stat-value">{activeCount}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Critical</div>
              <div className="stat-value" style={{ color: '#FF2D55' }}>{redCount}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Dispatched</div>
              <div className="stat-value" style={{ color: '#0A84FF' }}>
                {emergencies.filter(e => e.status === 'dispatched').length}
              </div>
            </div>
          </div>

          <div className="feed-container">
            {loading ? (
              <div className="empty-state">Loading active emergencies...</div>
            ) : emergencies.filter(e => e.status !== 'rejected').length === 0 ? (
              <div className="empty-state">No incoming emergencies detected.</div>
            ) : (
              emergencies.filter(e => e.status !== 'rejected').map((em) => (
              <div
                key={em.id}
                className="emergency-card"
                onClick={() => setActiveEmergencyId(em.id)}
                style={{
                  cursor: 'pointer',
                  borderColor: activeEmergencyId === em.id ? '#0A84FF'
                    : em.severity === 'red' ? '#FF2D55' : '#2C2C2E',
                  boxShadow: activeEmergencyId === em.id
                    ? '0 0 0 2px rgba(10, 132, 255, 0.3)'
                    : em.severity === 'red' && em.status === 'pending'
                      ? '0 0 20px rgba(255,45,85,0.3)'
                      : 'none',
                  opacity: em.status === 'resolved' ? 0.5 : 1,
                }}
              >
                <div className="card-header" style={{ borderBottom: `2px solid ${severityColors[em.severity] || '#34C759'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="severity-badge" style={{ backgroundColor: severityColors[em.severity] || '#34C759' }}>
                      {severityLabels[em.severity] || 'SAFE'}
                    </div>
                    {em.status === 'dispatched' && (
                      <div style={{ background: '#0A84FF', color: '#FFF', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                        🚑 DISPATCHED
                      </div>
                    )}
                    {em.status === 'arrived' && (
                      <div style={{ background: '#34C759', color: '#FFF', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                        ✅ ARRIVED
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8E8E93', fontSize: '12px' }}>
                    <Clock size={14} />
                    {format(new Date(em.created_at), 'HH:mm:ss')}
                  </div>
                </div>

                <div className="card-body">
                  <div className="summary">{em.ai_summary}</div>

                  {em.photo_urls?.length > 0 && (
                    <div className="photo-grid" style={{ marginBottom: '16px' }}>
                      {em.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt={`Case ${em.id} img ${i}`} />
                      ))}
                    </div>
                  )}

                  {em.ai_injuries?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#636366', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        Detected Injuries
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {em.ai_injuries.map((inj, i) => (
                          <span key={i} style={{ backgroundColor: '#2C2C2E', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>{inj}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI-generated preparation checklist */}
                  {em.ai_recommendations?.length > 0 && (em.status === 'dispatched' || em.status === 'arrived') && (
                    <div style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#0A84FF', fontWeight: 700, marginBottom: '8px' }}>🏥 AI PREPARATION CHECKLIST</div>
                      {em.ai_recommendations.map((rec, i) => (
                        <div key={i} style={{ fontSize: '13px', color: '#E5E5EA', marginBottom: '4px' }}>✓ {rec}</div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#AEAEB2', fontSize: '14px' }}>
                    <MapPin size={16} />
                    {em.address || 'Location data captured'}
                  </div>

                  {/* Responder live GPS indicator */}
                  {em.responder_lat && em.responder_lng && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B00', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
                      <span>🚑</span>
                      Responder live: {em.responder_lat.toFixed(4)}, {em.responder_lng.toFixed(4)}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {em.status === 'resolved'   && <CheckCircle size={14} color="#34C759" />}
                    {em.status === 'dispatched' && <span>🚑</span>}
                    {em.status === 'pending'    && <AlertTriangle size={14} color="#FF9500" />}
                    STATUS: {em.status?.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {em.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDispatch(em.id) }}
                          style={{ padding: '6px 14px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                        >
                          🚑 Dispatch
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(em.id) }}
                          style={{ padding: '6px 14px', background: '#3A3A3C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {(em.status === 'dispatched' || em.status === 'arrived') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(em.id) }}
                        style={{ padding: '6px 14px', background: '#34C759', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                    {em.status === 'dispatched' && simulatingId !== em.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startSimulation(em) }}
                        style={{ padding: '6px 14px', background: '#FF6B00', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                      >
                        ▶️ Simulate Drive
                      </button>
                    )}
                    {simulatingId === em.id && (
                      <div style={{ padding: '6px 14px', background: 'rgba(255, 107, 0, 0.2)', color: '#FF6B00', border: '1px solid #FF6B00', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                        Driving...
                      </div>
                    )}
                    <div style={{ color: '#636366', fontSize: '11px' }}>ID: {em.id.slice(0, 8)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        <div className="map-section" style={{ paddingLeft: '20px' }}>
          <div className="map-wrapper-container">
            <MapWrapper emergencies={emergencies.filter(e => e.status !== 'rejected')} activeEmergencyId={activeEmergencyId} hospital={hospital} />
          </div>
        </div>

      </main>
    </div>
  )
}

export default Dashboard
