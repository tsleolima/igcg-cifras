import { Link, useParams } from 'react-router-dom'
import { getAlbum, getAlbumSongs } from '../api/albums'
import { useAsync } from '../ui/hooks'
import { SongLink } from '../ui/SongLink'

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function AlbumDetailPageV2() {
  const params = useParams()
  const id = Number(params.id)
  const album = useAsync(() => getAlbum(id), [id])
  const songs = useAsync(() => getAlbumSongs(id), [id])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/albums" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeftIcon /> Voltar aos álbuns
        </Link>
      </div>

      {album.error && <div className="v2-error" style={{ marginBottom: 16 }}>⚠ {album.error}</div>}
      
      {album.loading || !album.data ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '40%', height: 32, marginBottom: 16 }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '32px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 24, flexWrap: 'wrap' }}>
            <div className="v2-album-cover" style={{ width: 140, height: 140, borderRadius: 'var(--radius-md)' }}>
              {album.data.cover_url ? (
                <img src={album.data.cover_url} alt={album.data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40 }}>📀</span>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {album.data.title}
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                  Álbum Oficial
                </span>
                {album.data.release_year && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                    Ano: {album.data.release_year}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Músicas</h2>
            </div>

            {songs.error && <div className="v2-error">⚠ {songs.error}</div>}
            
            {songs.loading ? (
              <div className="v2-top-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                    <div className="v2-skeleton v2-skeleton-line" style={{ width: `${60 + Math.random() * 20}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="v2-top-list">
                {(songs.data || []).map((s, idx) => (
                  <div key={s.id} className="v2-top-item" style={{ cursor: 'default' }}>
                    <div style={{ width: 30, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </div>
                    <div className="v2-top-info" style={{ marginLeft: 16 }}>
                      <SongLink to={`/songs/${s.id}`} className="v2-top-title" style={{ display: 'block' }}>
                        {s.title}
                      </SongLink>
                    </div>
                    <div className="v2-top-meta">
                      <span className="v2-top-plays">{formatPlays(s.play_count)} plays</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
