import { getTopSongs } from '../api/songs'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'
import { Link } from 'react-router-dom'

export function HomePage() {
  const topSongs = useAsync(() => getTopSongs({ limit: 10 }), [])
  const songCount = topSongs.data?.length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="homeExperience card">
        <div className="homeExperienceIntro">
          <div className="heroBadge">Comece por aqui</div>
          <div className="h3">Acesso rápido para tocar, buscar e organizar o repertório.</div>
          <div className="muted homeExperienceText">
            Abra a biblioteca, pesquise por trecho da letra ou continue pelo modo tocador com uma navegação mais prática.
          </div>
        </div>

        <div className="homeExperienceGrid">
          <Link to="/search" className="experienceTile experienceTilePrimary">
            <div className="experienceTileLabel">Busca por letra</div>
            <div className="experienceTileValue">Encontre um hino em segundos</div>
            <div className="experienceTileHint">Procure por título, trecho ou playlist.</div>
          </Link>

          <Link to="/songs" className="experienceTile">
            <div className="experienceTileLabel">Biblioteca</div>
            <div className="experienceTileValue">{songCount} músicas em destaque</div>
            <div className="experienceTileHint">Abra cifras, toque e favorite.</div>
          </Link>

          <div className="experienceTile experienceTileInfo">
            <div className="experienceTileLabel">Recursos úteis</div>
            <ul className="experienceList">
              <li>Transposição de tom</li>
              <li>Auto-scroll para tocar</li>
              <li>Playlists e favoritos</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="card">
        <div className="cardTitle">
          <div>
            <div className="h3">Top Songs</div>
            <div className="muted" style={{ fontSize: 12 }}>Mais tocadas no momento</div>
          </div>
          <Link to="/songs/top" className="topbarGhostLink">Ver ranking</Link>
        </div>
        {topSongs.error ? <ErrorBanner message={topSongs.error} /> : null}
        {topSongs.loading ? (
          <div className="muted">Carregando…</div>
        ) : (
          <div className="list featureList">
            {(topSongs.data || []).map((s, index) => (
              <div key={s.id} className="listItem featureItem">
                <div className="listMain">
                  <div className="featureRank">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <Link to={`/songs/${s.id}`} className="listTitle">
                      {s.title}
                    </Link>
                    <div className="listSub muted">{s.artist_name || `artist_id=${s.artist_id}`}</div>
                  </div>
                </div>
                <div className="listRight">
                  <span className="chip">Plays: <b>{s.play_count}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="cardTitle">
          <div>
            <div className="h3">Exploração rápida</div>
            <div className="muted" style={{ fontSize: 12 }}>Atalhos para navegação fluida</div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 14 }}>
          <Link to="/search" className="heroSecondaryLink">Busca por letra</Link>
          <Link to="/playlists" className="heroSecondaryLink">Playlists</Link>
          <Link to="/favorites" className="heroSecondaryLink">Favoritos</Link>
          <Link to="/albums" className="heroSecondaryLink">Álbuns</Link>
        </div>
      </div>
    </div>
  )
}
