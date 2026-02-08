import { Link, useParams } from 'react-router-dom'
import { getArtist } from '../api/artists'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function ArtistDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const state = useAsync(() => getArtist(id), [id])

  return (
    <div className="card">
      <div className="muted">
        <Link to="/artists">← Voltar</Link>
      </div>
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading || !state.data ? (
        <div className="muted">Carregando…</div>
      ) : (
        <>
          <h3 style={{ marginTop: 6 }}>{state.data.name}</h3>
          {state.data.bio ? <pre>{state.data.bio}</pre> : <div className="muted">(sem bio)</div>}
        </>
      )}
    </div>
  )
}
