import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Activity, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

function App() {
  const [emergencies, setEmergencies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveEmergencies()

    // Subscribe to REALTIME updates
    const subscription = supabase
      .channel('hospital-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current => [payload.new, ...current])
        // Play notification sound
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(e => console.log('Audio play failed', e))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies(current => 
          current.map(e => e.id === payload.new.id ? payload.new : e)
        )
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
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
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const severityColors = {
    red: '#FF2D55',
    orange: '#FF6B00',
    yellow: '#FFD60A'
  }

  const activeCount = emergencies.filter(e => e.status !== 'resolved').length
  const redCount = emergencies.filter(e => e.severity === 'red' && e.status !== 'resolved').length

  return (
    <div className="dashboard">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={32} color="#FF2D55" />
          <h1>LifeLink <span style={{ color: '#8E8E93', fontWeight: 400 }}>Hospital Monitor</span></h1>
        </div>
        <div style={{ color: '#8E8E93', fontSize: '14px' }}>
          LIVE FEED • {new Date().toLocaleDateString()}
        </div>
      </header>

      <main className="main-content">
        <div className="feed-container">
          {loading ? (
            <div className="empty-state">Loading active emergencies...</div>
          ) : emergencies.length === 0 ? (
            <div className="empty-state">No incoming emergencies detected.</div>
          ) : (
            emergencies.map((em) => (
              <div key={em.id} className="emergency-card">
                <div className="card-header" style={{ borderBottom: `2px solid ${severityColors[em.severity] || '#3A3A3C'}` }}>
                  <div className="severity-badge" style={{ backgroundColor: severityColors[em.severity] || '#3A3A3C' }}>
                    {em.severity || 'Unknown'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8E8E93', fontSize: '12px' }}>
                    <Clock size={14} />
                    {format(new Date(em.created_at), 'HH:mm:ss')}
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="summary">{em.ai_summary}</div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#636366', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Detected Injuries
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {em.ai_injuries?.map((inj, i) => (
                        <span key={i} style={{ backgroundColor: '#2C2C2E', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                          {inj}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#AEAEB2', fontSize: '14px' }}>
                    <MapPin size={16} />
                    {em.address || 'Location data captured'}
                  </div>

                  {em.photo_urls?.length > 0 && (
                    <div className="photo-grid">
                      {em.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt="Scene" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {em.status === 'dispatched' ? <CheckCircle size={14} color="#34C759" /> : <AlertTriangle size={14} color="#FF9500" />}
                    STATUS: {em.status.toUpperCase()}
                  </div>
                  <div>ID: {em.id.slice(0, 8)}</div>
                </div>
              </div>
            ))
          )}
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

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1C1C1E', borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Preparation Checklist</div>
            <div style={{ fontSize: '13px', color: '#AEAEB2', lineHeight: 2 }}>
              • Trauma Unit Ready<br/>
              • Blood Supply Check<br/>
              • Ortho Consult Paged<br/>
              • Imaging Bay Clear
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
