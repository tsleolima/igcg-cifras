import { Link } from 'react-router-dom'
import { listAllAlbums } from '../api/albums'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

function shouldShowAlbumTitle(title: string): boolean {
  const trimmed = title.trim()

  if (trimmed.length === 3 && trimmed !== '288') return false

  const hymnPattern = /^(\d+)\s*hino(?:\s*-\s*|\s+)(\d+)$/i
  const match = trimmed.match(hymnPattern)
  if (match && match[1] === match[2]) return false

  return true
}

export function AlbumsPage() {
  const state = useAsync(() => listAllAlbums({ pageSize: 100 }), [])
  const albums = (state.data || []).filter((a) => shouldShowAlbumTitle(a.title))

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Albums</h3>
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Ano</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link to={`/albums/${a.id}`}>{a.title}</Link>
                </td>
                <td>{a.release_year ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
