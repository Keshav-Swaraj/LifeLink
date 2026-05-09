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
  const audioRef = useRef(null)

  useEffect(() => {
    fetchActiveEmergencies()

    // Subscribe to REALTIME updates
    const subscription = supabase
      .channel('hospital-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current => [payload.new, ...current])
        setActiveEmergencyId(payload.new.id)
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
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [])

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

  async function handleDispatch(id) {
    try {
      const { error } = await supabase
        .from('emergencies')
        .update({ status: 'dispatched' })
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

  const severityColors = { red: '#FF2D55', orange: '#FF9500', yellow: '#FFCC00' }

  const activeEmergency = emergencies.find(e => e.id === activeEmergencyId)
  const activeCount = emergencies.filter(e => e.status !== 'resolved').length
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
        <div className="feed-container">
          {loading ? (
            <div className="empty-state">Loading active emergencies...</div>
          ) : emergencies.length === 0 ? (
            <div className="empty-state">No incoming emergencies detected.</div>
          ) : (
            emergencies.map((em) => (
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
                <div className="card-header" style={{ borderBottom: `2px solid ${severityColors[em.severity] || '#3A3A3C'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="severity-badge" style={{ backgroundColor: severityColors[em.severity] || '#3A3A3C' }}>
                      {em.severity?.toUpperCase() || 'Unknown'}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDispatch(em.id) }}
                        style={{ padding: '6px 14px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                      >
                        🚑 Dispatch Ambulance
                      </button>
                    )}
                    {(em.status === 'dispatched' || em.status === 'arrived') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(em.id) }}
                        style={{ padding: '6px 14px', background: '#34C759', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                    <div style={{ color: '#636366', fontSize: '11px' }}>ID: {em.id.slice(0, 8)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="map-section">
          <div className="map-wrapper-container">
            <MapWrapper emergencies={emergencies} activeEmergencyId={activeEmergencyId} />
          </div>
        </div>

        <aside className="stats-sidebar">
          <div className="stats-title">Unit Statistics</div>

          <div className="stat-item">
            <div className="stat-label">Total Incoming</div>
            <div className="stat-value">{activeCount}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Critical (RED)</div>
            <div className="stat-value" style={{ color: '#FF2D55' }}>{redCount}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Dispatched</div>
            <div className="stat-value" style={{ color: '#0A84FF' }}>
              {emergencies.filter(e => e.status === 'dispatched').length}
            </div>
          </div>

          {/* Active emergency preparation panel */}
          {activeEmergency && activeEmergency.status !== 'resolved' && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#1C1C1E', borderRadius: '12px', border: '1px solid #2C2C2E' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF2D55', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Active Case
              </div>
              <div style={{ fontSize: '13px', color: '#FFF', fontWeight: 600, marginBottom: '8px' }}>
                {activeEmergency.severity?.toUpperCase()} — {activeEmergency.address?.split(',')[0] || 'Unknown location'}
              </div>
              {activeEmergency.ai_recommendations?.length > 0 ? (
                <div style={{ fontSize: '13px', color: '#AEAEB2', lineHeight: 1.8 }}>
                  {activeEmergency.ai_recommendations.slice(0, 4).map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#AEAEB2', lineHeight: 2 }}>
                  • Trauma Unit Ready<br />
                  • Blood Supply Check<br />
                  • Ortho Consult Paged<br />
                  • Imaging Bay Clear
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default Dashboard
