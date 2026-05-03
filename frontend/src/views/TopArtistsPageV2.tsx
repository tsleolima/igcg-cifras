import { Link } from 'react-router-dom'
import { getTopArtists } from '../api/artists'
import { useAsync } from '../ui/hooks'

export function TopArtistsPageV2() {
  const state = useAsync(() => getTopArtists({ limit: 100 }), [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Top Artistas
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Os artistas mais buscados em nossa plataforma
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {state.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div style={{ width: 30, textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{i + 1}</div>
                <div className="v2-top-info" style={{ marginLeft: 16 }}>
                  <div className="v2-skeleton v2-skeleton-line" style={{ width: `${50 + Math.random() * 30}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="v2-top-list">
            {(state.data || []).map((a, index) => (
              <div key={a.id} className="v2-top-item" style={{ cursor: 'pointer' }}>
                <div style={{ width: 30, textAlign: 'center', fontSize: 18, fontWeight: 800, color: index < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {index + 1}
                </div>
                <div className="v2-top-info" style={{ marginLeft: 16 }}>
                  <Link to={`/artists/${a.id}`} className="v2-top-title" style={{ display: 'block', fontSize: 16 }}>
                    {a.name}
                  </Link>
                </div>
                <div className="v2-top-meta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
