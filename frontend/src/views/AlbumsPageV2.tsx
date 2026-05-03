import { Link } from 'react-router-dom'
import { listAllAlbums } from '../api/albums'
import { useAsync } from '../ui/hooks'

function shouldShowAlbumTitle(title: string): boolean {
  const trimmed = title.trim()
  if (trimmed.length === 3 && trimmed !== '288') return false
  const hymnPattern = /^(\d+)\s*hino(?:\s*-\s*|\s+)(\d+)$/i
  const match = trimmed.match(hymnPattern)
  if (match && match[1] === match[2]) return false
  return true
}

export function AlbumsPageV2() {
  const state = useAsync(() => listAllAlbums({ pageSize: 100 }), [])
  const albums = (state.data || []).filter((a) => shouldShowAlbumTitle(a.title))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Álbuns
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Coleção completa de álbuns e coletâneas
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {state.loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 20 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ pointerEvents: 'none' }}>
                <div className="v2-album-cover v2-skeleton" style={{ width: '100%', height: 'auto', aspectRatio: '1/1' }} />
                <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%', marginTop: 10 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 20 }}>
            {albums.map((a) => (
              <Link key={a.id} to={`/albums/${a.id}`} className="v2-album-card" style={{ width: '100%' }}>
                <div className="v2-album-cover" style={{ width: '100%', height: 'auto', aspectRatio: '1/1' }}>
                  {a.cover_url ? (
                    <img src={a.cover_url} alt={a.title} loading="lazy" />
                  ) : (
                    <span>📀</span>
                  )}
                </div>
                <div className="v2-album-name">{a.title}</div>
                {a.release_year && <div className="v2-album-year">{a.release_year}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
