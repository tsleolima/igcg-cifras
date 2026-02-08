import { Link } from 'react-router-dom'
import { listFavorites } from '../api/favorites'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function FavoritesPage() {
  const state = useAsync(() => listFavorites({ skip: 0, limit: 100 }), [])

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Favorites</h3>
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
