import { Link } from 'react-router-dom'
import { listFavorites } from '../api/favorites'
import { useAsync } from '../ui/hooks'
import { SongLink } from '../ui/SongLink'

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {filled ? (
        <path
          d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
          fill="currentColor"
          opacity="0.92"
        />
      ) : (
        <path
          d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function FavoritesPageV2() {
  const state = useAsync(() => listFavorites({ skip: 0, limit: 100 }), [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Favoritas
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Seus louvores e cifras armazenados no perfil
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {state.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div className="v2-top-info">
                   <div className="v2-skeleton v2-skeleton-line" style={{ width: `${50 + Math.random() * 30}%` }} />
                   <div className="v2-skeleton v2-skeleton-line short" style={{ width: '30%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {(state.data || []).length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                 <div style={{ fontSize: 40, marginBottom: 12 }}>💔</div>
                 <div style={{ fontSize: 15 }}>Você ainda não favoritou nenhuma cifra.</div>
                 <Link to="/songs" className="v2-btn v2-btn-outline" style={{ marginTop: 16 }}>Explorar cifras</Link>
               </div>
            ) : (
              <div className="v2-top-list">
                {(state.data || []).map((s) => (
                  <div key={s.id} className="v2-top-item" style={{ cursor: 'default' }}>
                    <div className="v2-top-info">
                      <SongLink to={`/songs/${s.id}`} className="v2-top-title" style={{ display: 'block' }}>
                        {s.title}
                      </SongLink>
                      <Link to={`/artists/${s.artist_id}`} className="v2-top-artist" style={{ display: 'inline-block' }}>
                        {s.artist_name || `artist_id=${s.artist_id}`}
                      </Link>
                    </div>

                    <div className="v2-top-meta">
                      <span className="v2-top-plays">{formatPlays(s.play_count)} plays</span>
                      <div className="v2-btn v2-btn-primary" style={{ padding: '6px 8px', pointerEvents: 'none', borderColor: 'var(--primary-dark)' }}>
                        <HeartIcon filled={true} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
