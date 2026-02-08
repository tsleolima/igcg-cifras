import { getTopSongs } from '../api/songs'
import { getTopArtists } from '../api/artists'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'
import { Link } from 'react-router-dom'

export function HomePage() {
  const topSongs = useAsync(() => getTopSongs({ limit: 10 }), [])
  const topArtists = useAsync(() => getTopArtists({ limit: 10 }), [])

  return (
    <div className="row">
      <div className="card">
        <div className="cardTitle">
          <div className="h3">Top Songs</div>
          <div className="muted" style={{ fontSize: 12 }}>Mais tocadas</div>
        </div>
        {topSongs.error ? <ErrorBanner message={topSongs.error} /> : null}
        {topSongs.loading ? (
          <div className="muted">Carregando…</div>
        ) : (
          <div className="list">
            {(topSongs.data || []).map((s) => (
              <div key={s.id} className="listItem">
                <div className="listMain">
                  <Link to={`/songs/${s.id}`} className="listTitle">
                    {s.title}
                  </Link>
                  <div className="listSub muted">{s.artist_name || `artist_id=${s.artist_id}`}</div>
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
          <div className="h3">Top Artists</div>
          <div className="muted" style={{ fontSize: 12 }}>Em destaque</div>
        </div>
        {topArtists.error ? <ErrorBanner message={topArtists.error} /> : null}
        {topArtists.loading ? (
          <div className="muted">Carregando…</div>
        ) : (
          <div className="list">
            {(topArtists.data || []).map((a) => (
              <div key={a.id} className="listItem">
                <div className="listMain">
                  <Link to={`/artists/${a.id}`} className="listTitle">
                    {a.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
