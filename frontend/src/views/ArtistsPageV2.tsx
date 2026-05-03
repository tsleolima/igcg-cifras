import { Link } from 'react-router-dom'
import { listArtists } from '../api/artists'
import { useAsync } from '../ui/hooks'

export function ArtistsPageV2() {
  const state = useAsync(() => listArtists({ skip: 0, limit: 100 }), [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Artistas
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Lista de cantores e bandas disponíveis
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {state.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div className="v2-top-info">
                  <div className="v2-skeleton v2-skeleton-line" style={{ width: `${30 + Math.random() * 20}%`, marginBottom: 0 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="v2-top-list">
            {(state.data || []).map((a) => (
              <Link key={a.id} to={`/artists/${a.id}`} className="v2-top-item">
                <div className="v2-quick-icon" style={{ width: 36, height: 36, fontSize: 16 }}>🎤</div>
                <div className="v2-top-info">
                  <div className="v2-top-title" style={{ fontSize: 15 }}>{a.name}</div>
                </div>
                <div className="v2-top-meta">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
