import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listSongs } from '../api/songs'
import { addFavorite, removeFavorite } from '../api/favorites'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'
import type { SongHymnListResponse } from '../api/types'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="songActionIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <Icon>
        <path
          d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
          fill="currentColor"
          opacity="0.92"
        />
      </Icon>
    )
  }

  return (
    <Icon>
      <path
        d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Icon>
  )
}

export function SongsPage() {
  const [skip, setSkip] = useState(0)

  // Applied filters (minimal on purpose).
  const [language, setLanguage] = useState<string>('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // Draft values (edit then apply).
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
    if (isFav) await removeFavorite(song.id)
    else await addFavorite(song.id)
    state.setData((state.data || []).map((s) => (s.id === song.id ? { ...s, is_favorited: !isFav } : s)))
  }

  function onSubmitFilters(e: FormEvent) {
    e.preventDefault()
    setLanguage(draftLanguage)
    setFavoritesOnly(draftFavoritesOnly)
    setSkip(0)
  }

  return (
    <div className="card">
      <div className="cardTitle">
        <div className="h3">Sons</div>
        <div className="muted" style={{ fontSize: 12 }}>Lista de músicas</div>
      </div>

      <div style={{ height: 10 }} />

      <form onSubmit={onSubmitFilters} className="songFilters">
        <label className="muted" style={{ fontSize: 12 }}>
          Idioma
          <select value={draftLanguage} onChange={(e) => setDraftLanguage(e.target.value)}>
            <option value="">(qualquer)</option>
            <option value="pt">pt</option>
            <option value="en">en</option>
            <option value="es">es</option>
          </select>
        </label>

        <label className="muted" style={{ fontSize: 12 }}>
          Somente favoritos
          <select value={draftFavoritesOnly ? '1' : '0'} onChange={(e) => setDraftFavoritesOnly(e.target.value === '1')}>
            <option value="0">Não</option>
            <option value="1">Sim</option>
          </select>
        </label>

        <div className="songFiltersActions">
          <button className="primary" type="submit">Aplicar</button>
          <button
            type="button"
            onClick={() => {
              setDraftLanguage('')
              setDraftFavoritesOnly(false)
              setLanguage('')
              setFavoritesOnly(false)
              setSkip(0)
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      <div style={{ height: 12 }} />
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
        <>
          <div className="list">
            {(state.data || []).map((s) => (
              <div key={s.id} className="listItem">
                <div className="listMain">
                  <Link to={`/songs/${s.id}`} className="listTitle">
                    {s.title}
                  </Link>
                  <div className="listSub muted">{s.artist_name || `artist_id=${s.artist_id}`}</div>
                </div>
                <div className="listRight">
                  <span className="chip">Plays: <b>{s.play_count}</b></span>
                  <button
                    className={s.is_favorited ? 'songActionBtn isActive' : 'songActionBtn'}
                    onClick={() => void toggleFavorite(s)}
                    aria-label={s.is_favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    title={s.is_favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <HeartIcon filled={Boolean(s.is_favorited)} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 12 }} />
          <div className="pager">
            <button onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0}>
              Anterior
            </button>
            <div className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>
              Página {Math.floor(skip / limit) + 1}
            </div>
            <button onClick={() => setSkip(skip + limit)}>Próximo</button>
          </div>
        </>
      )}
    </div>
  )
}
