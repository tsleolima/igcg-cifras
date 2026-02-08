import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listAllAlbums, createAlbum, updateAlbum } from '../api/albums'
import { createArtist, updateArtist } from '../api/artists'
import { createSong, updateSong } from '../api/songs'
import type { AlbumResponse } from '../api/types'
import { ErrorBanner, SuccessBanner } from '../ui/Feedback'

export function AdminPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [songId, setSongId] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songDuration, setSongDuration] = useState('')
  const [songAudioUrl, setSongAudioUrl] = useState('')
  const [songCoverUrl, setSongCoverUrl] = useState('')
  const [songGenre, setSongGenre] = useState('')
  const [songLanguage, setSongLanguage] = useState('')
  const [songAlbumId, setSongAlbumId] = useState('')
  const [songLyrics, setSongLyrics] = useState('')
  const [songLyricsChords, setSongLyricsChords] = useState('')

  const [albums, setAlbums] = useState<AlbumResponse[]>([])
  const [albumsLoading, setAlbumsLoading] = useState(false)
  const [albumsLoadError, setAlbumsLoadError] = useState<string | null>(null)

  const [albumId, setAlbumId] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumCoverUrl, setAlbumCoverUrl] = useState('')
  const [albumYear, setAlbumYear] = useState('')

  const [artistId, setArtistId] = useState('')
  const [artistName, setArtistName] = useState('')
  const [artistBio, setArtistBio] = useState('')
  const [artistImageUrl, setArtistImageUrl] = useState('')

  function resetFeedback() {
    setError(null)
    setSuccess(null)
  }

  useEffect(() => {
    let cancelled = false

    async function loadAlbums() {
      setAlbumsLoading(true)
      setAlbumsLoadError(null)
      try {
        const items = await listAllAlbums({ pageSize: 100 })
        if (cancelled) return
        const sorted = [...(items ?? [])].sort((a, b) => a.title.localeCompare(b.title))
        setAlbums(sorted)
      } catch (e: any) {
        if (cancelled) return
        setAlbums([])
        setAlbumsLoadError(e?.message || 'Falha ao carregar albums')
      } finally {
        if (!cancelled) setAlbumsLoading(false)
      }
    }

    loadAlbums()
    return () => {
      cancelled = true
    }
  }, [])

  async function onCreateSong(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const created = await createSong({
        title: songTitle,
        duration: Number(songDuration),
        audio_url: songAudioUrl,
        cover_url: songCoverUrl || null,
        genre: songGenre || null,
        language: songLanguage || null,
        album_id: songAlbumId ? Number(songAlbumId) : null,
        lyrics: songLyrics || null,
        lyrics_with_chords: songLyricsChords || null,
      })
      setSuccess(`Song criada: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar song (talvez você não seja admin)')
    }
  }

  async function onUpdateSong(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const updated = await updateSong(Number(songId), {
        title: songTitle || undefined,
        duration: songDuration ? Number(songDuration) : undefined,
        audio_url: songAudioUrl || undefined,
        cover_url: songCoverUrl || null,
        genre: songGenre || null,
        language: songLanguage || null,
        lyrics: songLyrics || null,
        lyrics_with_chords: songLyricsChords || null,
      })
      setSuccess(`Song atualizada: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar song (talvez você não seja admin)')
    }
  }

  async function onCreateAlbum(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const created = await createAlbum({
        title: albumTitle,
        cover_url: albumCoverUrl || null,
        release_year: albumYear ? Number(albumYear) : null,
      })
      setSuccess(`Album criado: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar album (talvez você não seja admin)')
    }
  }

  async function onUpdateAlbum(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const updated = await updateAlbum(Number(albumId), {
        title: albumTitle || undefined,
        cover_url: albumCoverUrl || null,
        release_year: albumYear ? Number(albumYear) : null,
      })
      setSuccess(`Album atualizado: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar album (talvez você não seja admin)')
    }
  }

  async function onCreateArtist(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const created = await createArtist({
        name: artistName,
        bio: artistBio || null,
        image_url: artistImageUrl || null,
      })
      setSuccess(`Artist criado: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar artist (talvez você não seja admin)')
    }
  }

  async function onUpdateArtist(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const updated = await updateArtist(Number(artistId), {
        name: artistName || undefined,
        bio: artistBio || null,
        image_url: artistImageUrl || null,
      })
      setSuccess(`Artist atualizado: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar artist (talvez você não seja admin)')
    }
  }

  return (
    <div className="row">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Admin</h3>
        <div className="muted">As rotas admin dependem de superuser no backend. Se der 403, é esperado.</div>
        <div style={{ height: 10 }} />
        {error ? <ErrorBanner message={error} /> : null}
        {success ? <SuccessBanner message={success} /> : null}
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Songs (POST/PUT)</h4>
        <form onSubmit={onCreateSong}>
          <div className="row">
            <div>
              <label>Title</label>
              <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />
            </div>
            <div>
              <label>Duration (s)</label>
              <input value={songDuration} onChange={(e) => setSongDuration(e.target.value)} placeholder="240" />
            </div>
            <div>
              <label>Audio URL</label>
              <input value={songAudioUrl} onChange={(e) => setSongAudioUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label>Cover URL</label>
              <input value={songCoverUrl} onChange={(e) => setSongCoverUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label>Genre</label>
              <input value={songGenre} onChange={(e) => setSongGenre(e.target.value)} />
            </div>
            <div>
              <label>Language</label>
              <input value={songLanguage} onChange={(e) => setSongLanguage(e.target.value)} placeholder="pt" />
            </div>
            <div>
              <label>Album</label>
              <select value={songAlbumId} onChange={(e) => setSongAlbumId(e.target.value)} disabled={albumsLoading}>
                <option value="">{albumsLoading ? 'Carregando...' : 'Sem álbum / Selecione um álbum'}</option>
                {albums.map((album) => (
                  <option key={album.id} value={String(album.id)}>
                    {album.title} {album.release_year ? `(${album.release_year}) ` : ''}#{album.id}
                  </option>
                ))}
              </select>
              {albumsLoadError ? <div className="muted">{albumsLoadError}</div> : null}
            </div>
            <div>
              <label>Lyrics</label>
              <textarea rows={3} value={songLyrics} onChange={(e) => setSongLyrics(e.target.value)} />
            </div>
            <div>
              <label>Lyrics with chords</label>
              <textarea rows={3} value={songLyricsChords} onChange={(e) => setSongLyricsChords(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="primary">Criar song</button>
          </div>
        </form>

        <div style={{ height: 12 }} />
        <form onSubmit={onUpdateSong}>
          <div className="row">
            <div>
              <label>Song ID (para PUT)</label>
              <input value={songId} onChange={(e) => setSongId(e.target.value)} placeholder="123" />
            </div>
          </div>
          <button className="primary">Atualizar song</button>
        </form>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Albums (POST/PUT)</h4>
        <form onSubmit={onCreateAlbum} className="row">
          <div>
            <label>Title</label>
            <input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          </div>
          <div>
            <label>Cover URL</label>
            <input value={albumCoverUrl} onChange={(e) => setAlbumCoverUrl(e.target.value)} />
          </div>
          <div>
            <label>Release year</label>
            <input value={albumYear} onChange={(e) => setAlbumYear(e.target.value)} placeholder="2024" />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="primary">Criar album</button>
          </div>
        </form>
        <div style={{ height: 12 }} />
        <form onSubmit={onUpdateAlbum} className="row">
          <div>
            <label>Album ID (para PUT)</label>
            <input value={albumId} onChange={(e) => setAlbumId(e.target.value)} placeholder="5" />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="primary">Atualizar album</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Artists (POST/PUT)</h4>
        <form onSubmit={onCreateArtist} className="row">
          <div>
            <label>Name</label>
            <input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </div>
          <div>
            <label>Image URL</label>
            <input value={artistImageUrl} onChange={(e) => setArtistImageUrl(e.target.value)} />
          </div>
          <div>
            <label>Bio</label>
            <textarea rows={3} value={artistBio} onChange={(e) => setArtistBio(e.target.value)} />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="primary">Criar artist</button>
          </div>
        </form>
        <div style={{ height: 12 }} />
        <form onSubmit={onUpdateArtist} className="row">
          <div>
            <label>Artist ID (para PUT)</label>
            <input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="1" />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="primary">Atualizar artist</button>
          </div>
        </form>
      </div>
    </div>
  )
}
