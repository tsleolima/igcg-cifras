import { Link, useParams } from 'react-router-dom'
import { getAlbum, getAlbumSongs } from '../api/albums'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function AlbumDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const album = useAsync(() => getAlbum(id), [id])
  const songs = useAsync(() => getAlbumSongs(id), [id])

  return (
    <div className="card">
      <div className="muted">
        <Link to="/albums">← Voltar</Link>
      </div>

      {album.error ? <ErrorBanner message={album.error} /> : null}
      {album.loading || !album.data ? (
        <div className="muted">Carregando…</div>
      ) : (
        <>
          <h3 style={{ marginTop: 6 }}>{album.data.title}</h3>
          <div className="muted">Ano: {album.data.release_year ?? '-'}</div>
        </>
      )}

      <div style={{ height: 12 }} />
      <h4 style={{ marginTop: 0 }}>Songs</h4>
      {songs.error ? <ErrorBanner message={songs.error} /> : null}
      {songs.loading ? (
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
            {(songs.data || []).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/songs/${s.id}`}>{s.title}</Link>
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
