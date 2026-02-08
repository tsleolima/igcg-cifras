import { Link } from 'react-router-dom'
import { getTopArtists } from '../api/artists'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function TopArtistsPage() {
  const state = useAsync(() => getTopArtists({ limit: 20 }), [])

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Top Artists</h3>
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Artista</th>
            </tr>
          </thead>
          <tbody>
            {(state.data || []).map((a) => (
              <tr key={a.id}>
                <td>
                  <Link to={`/artists/${a.id}`}>{a.name}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
