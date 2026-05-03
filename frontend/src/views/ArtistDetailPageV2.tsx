import { Link, useParams } from 'react-router-dom'
import { getArtist } from '../api/artists'
import { useAsync } from '../ui/hooks'

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function ArtistDetailPageV2() {
  const params = useParams()
  const id = Number(params.id)
  const state = useAsync(() => getArtist(id), [id])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/artists" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeftIcon /> Voltar aos artistas
        </Link>
      </div>

      {state.error && <div className="v2-error" style={{ marginBottom: 16 }}>⚠ {state.error}</div>}

      {state.loading || !state.data ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '40%', height: 32, marginBottom: 16 }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%' }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '70%' }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '60%' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '32px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0, border: '1px solid var(--border-light)' }}>
              🎤
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {state.data.name}
              </h1>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                Artista da IGCG
              </span>
            </div>
          </div>

          <div style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: 15 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Sobre</h2>
            {state.data.bio ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{state.data.bio}</div>
            ) : (
              <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                Nenhuma biografia cadastrada para este artista.
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-light)' }}>
            <Link to={`/search?q=${encodeURIComponent(state.data.name)}`} className="v2-btn v2-btn-outline">
              Buscar cifras de {state.data.name}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
