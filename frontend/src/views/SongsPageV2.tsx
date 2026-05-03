import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listSongs } from '../api/songs'
import { addFavorite, removeFavorite } from '../api/favorites'
import { useAsync } from '../ui/hooks'
import { SongLink } from '../ui/SongLink'
import type { SongHymnListResponse } from '../api/types'

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Icon>
      <path
        d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'} opacity={filled ? 0.92 : 1}
      />
    </Icon>
  )
}

function ChevronLeftIcon() {
  return <Icon size={16}><path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

function ChevronRightIcon() {
  return <Icon size={16}><path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

function FilterIcon() {
  return <Icon size={16}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Icon>
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function SongsPageV2() {
  const [skip, setSkip] = useState(0)

  // Applied filters
  const [language, setLanguage] = useState<string>('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // Draft values (edit then apply)
  const [draftLanguage, setDraftLanguage] = useState<string>('')
  const [draftFavoritesOnly, setDraftFavoritesOnly] = useState(false)

  const limit = 20
  const queryKey = useMemo(() => [skip, language, favoritesOnly], [skip, language, favoritesOnly])
  const state = useAsync(
    () =>
      listSongs({
        skip,
        limit,
        language: language || undefined,
        favorites_only: favoritesOnly,
      }),
    queryKey,
  )

  async function toggleFavorite(song: SongHymnListResponse) {
    const isFav = Boolean(song.is_favorited)
    try {
      if (isFav) await removeFavorite(song.id)
      else await addFavorite(song.id)
      state.setData((state.data || []).map((s) => (s.id === song.id ? { ...s, is_favorited: !isFav } : s)))
    } catch {
      // alert or ignore
    }
  }

  function onSubmitFilters(e: FormEvent) {
    e.preventDefault()
    setLanguage(draftLanguage)
    setFavoritesOnly(draftFavoritesOnly)
    setSkip(0)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Todas as cifras
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Explore o acervo completo de cifras e louvores
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Filters Form */}
        <form onSubmit={onSubmitFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
          <label className="v2-field" style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Idioma</span>
            <select 
              value={draftLanguage} 
              onChange={(e) => setDraftLanguage(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 14, outline: 'none' }}
            >
              <option value="">Todos</option>
              <option value="pt">Português</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
          </label>

          <label className="v2-field" style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filtro</span>
            <select 
              value={draftFavoritesOnly ? '1' : '0'} 
              onChange={(e) => setDraftFavoritesOnly(e.target.value === '1')}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 14, outline: 'none' }}
            >
              <option value="0">Mostrar tudo</option>
              <option value="1">Apenas meus favoritos</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="v2-btn v2-btn-outline" type="button" onClick={() => {
              setDraftLanguage(''); setDraftFavoritesOnly(false)
              setLanguage(''); setFavoritesOnly(false); setSkip(0)
            }}>
              Limpar
            </button>
            <button className="v2-btn v2-btn-primary" type="submit">
              <FilterIcon /> Filtrar
            </button>
          </div>
        </form>

        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {/* List */}
        {state.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div style={{ width: 44 }} />
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
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15 }}>Nenhuma cifra encontrada.</div>
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
                      
                      <button
                        className={`v2-btn ${s.is_favorited ? 'v2-btn-primary' : 'v2-btn-outline'}`}
                        style={{ padding: '6px 8px', borderColor: s.is_favorited ? 'var(--primary-dark)' : 'var(--border)' }}
                        onClick={() => void toggleFavorite(s)}
                        aria-label="Toggle favorito"
                        title="Toggle favorito"
                      >
                        <HeartIcon filled={Boolean(s.is_favorited)} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {((state.data || []).length > 0 || skip > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                <button 
                  className="v2-btn v2-btn-outline" 
                  onClick={() => setSkip(Math.max(0, skip - limit))} 
                  disabled={skip === 0}
                >
                  <ChevronLeftIcon /> Anterior
                </button>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Página {Math.floor(skip / limit) + 1}
                </div>
                <button 
                  className="v2-btn v2-btn-outline" 
                  onClick={() => setSkip(skip + limit)}
                  disabled={(state.data || []).length < limit}
                >
                  Próxima <ChevronRightIcon />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
