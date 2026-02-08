import { Link } from 'react-router-dom'
import { getTopSongs } from '../api/songs'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function TopSongsPage() {
  const state = useAsync(() => getTopSongs({ limit: 20 }), [])

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Top Songs</h3>
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Plays</th>
            </tr>
          </thead>
          <tbody>
            {(state.data || []).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/songs/${s.id}`}>{s.title}</Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {s.artist_name || `artist_id=${s.artist_id}`}
                  </div>
                </td>
                <td>{s.play_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
