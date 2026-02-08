import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listMyPlaylists, listPlaylists } from '../api/playlists'
import { useAsync } from '../ui/hooks'
import { ErrorBanner } from '../ui/Feedback'

export function PlaylistsPage() {
  const [publicOnly, setPublicOnly] = useState(false)
  const [mode, setMode] = useState<'all' | 'my'>('all')

  const state = useAsync(
    () => (mode === 'my' ? listMyPlaylists({ skip: 0, limit: 100 }) : listPlaylists({ skip: 0, limit: 100, public_only: publicOnly })),
    [mode, publicOnly],
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Playlists</h3>
        <Link to="/playlists/new">
          <button className="primary">+ Nova</button>
        </Link>
      </div>

      <div style={{ height: 10 }} />
      <form onSubmit={onSubmit} className="row">
        <div>
          <label>Modo</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="all">Todas (públicas + minhas)</option>
            <option value="my">Minhas</option>
          </select>
        </div>
        <div>
          <label>public_only (somente modo 'all')</label>
          <select value={publicOnly ? '1' : '0'} onChange={(e) => setPublicOnly(e.target.value === '1')} disabled={mode !== 'all'}>
            <option value="0">Não</option>
            <option value="1">Sim</option>
          </select>
        </div>
      </form>

      <div style={{ height: 12 }} />
      {state.error ? <ErrorBanner message={state.error} /> : null}
      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Owner</th>
              <th>Pública</th>
              <th>Songs</th>
            </tr>
          </thead>
          <tbody>
            {(state.data || []).map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/playlists/${p.id}`}>{p.name}</Link>
                  {p.description ? <div className="muted" style={{ fontSize: 12 }}>{p.description}</div> : null}
                </td>
                <td>{p.owner_username}</td>
                <td>{p.is_public ? 'Sim' : 'Não'}</td>
                <td>{p.song_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
