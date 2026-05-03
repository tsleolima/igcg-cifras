import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listAllAlbums, createAlbum, updateAlbum } from '../api/albums'
import { createArtist, updateArtist } from '../api/artists'
import { createSong, updateSong } from '../api/songs'
import type { AlbumResponse } from '../api/types'

export function AdminPageV2() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Song states
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

  // Album states
  const [albums, setAlbums] = useState<AlbumResponse[]>([])
  const [albumsLoading, setAlbumsLoading] = useState(false)
  const [albumsLoadError, setAlbumsLoadError] = useState<string | null>(null)
  const [albumId, setAlbumId] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumCoverUrl, setAlbumCoverUrl] = useState('')
  const [albumYear, setAlbumYear] = useState('')

  // Artist states
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
    return () => { cancelled = true }
  }, [])

  /* ------------------- SONGS ------------------- */
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
      setSuccess(`Música criada: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar música (verifique seus privilégios de Admin)')
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
      setSuccess(`Música atualizada: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar música (verifique seus privilégios de Admin)')
    }
  }

  /* ------------------- ALBUMS ------------------- */
  async function onCreateAlbum(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const created = await createAlbum({
        title: albumTitle,
        cover_url: albumCoverUrl || null,
        release_year: albumYear ? Number(albumYear) : null,
      })
      setSuccess(`Álbum criado: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar álbum (verifique seus privilégios de Admin)')
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
      setSuccess(`Álbum atualizado: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar álbum (verifique seus privilégios de Admin)')
    }
  }

  /* ------------------- ARTISTS ------------------- */
  async function onCreateArtist(e: FormEvent) {
    e.preventDefault()
    resetFeedback()
    try {
      const created = await createArtist({
        name: artistName,
        bio: artistBio || null,
        image_url: artistImageUrl || null,
      })
      setSuccess(`Artista criado: #${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar artista (verifique seus privilégios de Admin)')
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
      setSuccess(`Artista atualizado: #${updated.id}`)
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar artista (verifique seus privilégios de Admin)')
    }
  }

  // Common input style
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: '#fff',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border 0.2s'
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Painel de Controle 🛡️
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Acesso restrito à equipe interna.
        </p>
      </div>

      {error && <div className="v2-error" style={{ marginBottom: 24 }}>⚠ {error}</div>}
      {success && (
        <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(58, 133, 40, 0.08)', border: '1px solid rgba(58, 133, 40, 0.20)', fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)' }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        
        {/* === SECTION: SONGS === */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
            🎵 Gerenciar Cifras
          </h2>

          <form onSubmit={onCreateSong} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Título</span><input style={inputStyle} value={songTitle} onChange={(e) => setSongTitle(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label className="v2-field" style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Duração (s)</span><input style={inputStyle} placeholder="Ex: 240" value={songDuration} onChange={(e) => setSongDuration(e.target.value)} /></label>
              <label className="v2-field" style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Idioma</span><input style={inputStyle} placeholder="pt, en" value={songLanguage} onChange={(e) => setSongLanguage(e.target.value)} /></label>
            </div>
            
            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Áudio URL</span><input style={inputStyle} placeholder="https://..." value={songAudioUrl} onChange={(e) => setSongAudioUrl(e.target.value)} /></label>
            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cover URL</span><input style={inputStyle} placeholder="https://..." value={songCoverUrl} onChange={(e) => setSongCoverUrl(e.target.value)} /></label>
            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Gênero</span><input style={inputStyle} value={songGenre} onChange={(e) => setSongGenre(e.target.value)} /></label>
            
            <label className="v2-field">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Álbum (Opcional)</span>
              <select style={inputStyle} value={songAlbumId} onChange={(e) => setSongAlbumId(e.target.value)} disabled={albumsLoading}>
                <option value="">{albumsLoading ? 'Carregando...' : 'Nenhum / Selecione um Álbum'}</option>
                {albums.map((album) => (
                  <option key={album.id} value={String(album.id)}>{album.title} {album.release_year ? `(${album.release_year}) ` : ''} #{album.id}</option>
                ))}
              </select>
              {albumsLoadError && <div style={{ fontSize: 12, color: '#dc3545', marginTop: 4 }}>{albumsLoadError}</div>}
            </label>

            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Letra Crua</span><textarea style={{ ...inputStyle, minHeight: 80 }} value={songLyrics} onChange={(e) => setSongLyrics(e.target.value)} /></label>
            <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cifra Completa (ChordPro)</span><textarea style={{ ...inputStyle, minHeight: 120 }} value={songLyricsChords} onChange={(e) => setSongLyricsChords(e.target.value)} /></label>

            <button type="submit" className="v2-btn v2-btn-primary" style={{ marginTop: 8 }}>Criar Nova Música (POST)</button>
          </form>

          <form onSubmit={onUpdateSong} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dashed var(--border-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
             <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Para Atualizar: Informe o ID da Música</span><input style={inputStyle} placeholder="Ex: 153" value={songId} onChange={(e) => setSongId(e.target.value)} /></label>
             <button type="submit" className="v2-btn v2-btn-outline">Atualizar Música por ID (PUT)</button>
             <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>* Apenas os campos preenchidos acima serão sobrepostos.</div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* === SECTION: ALBUMS === */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
              📀 Gerenciar Álbuns
            </h2>
            <form onSubmit={onCreateAlbum} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Título</span><input style={inputStyle} value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} /></label>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cover URL</span><input style={inputStyle} value={albumCoverUrl} onChange={(e) => setAlbumCoverUrl(e.target.value)} /></label>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Ano de Lançamento</span><input style={inputStyle} placeholder="Ex: 2024" value={albumYear} onChange={(e) => setAlbumYear(e.target.value)} /></label>
              <button type="submit" className="v2-btn v2-btn-primary" style={{ marginTop: 8 }}>Criar Novo Álbum (POST)</button>
            </form>

            <form onSubmit={onUpdateAlbum} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dashed var(--border-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
               <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Para Atualizar: Informe o ID do Álbum</span><input style={inputStyle} placeholder="Ex: 5" value={albumId} onChange={(e) => setAlbumId(e.target.value)} /></label>
               <button type="submit" className="v2-btn v2-btn-outline">Atualizar Álbum por ID (PUT)</button>
            </form>
          </div>

          {/* === SECTION: ARTISTS === */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
              🎤 Gerenciar Artistas
            </h2>
            <form onSubmit={onCreateArtist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome do Artista</span><input style={inputStyle} value={artistName} onChange={(e) => setArtistName(e.target.value)} /></label>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Image URL</span><input style={inputStyle} value={artistImageUrl} onChange={(e) => setArtistImageUrl(e.target.value)} /></label>
              <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Biografia</span><textarea style={{ ...inputStyle, minHeight: 80 }} value={artistBio} onChange={(e) => setArtistBio(e.target.value)} /></label>
              <button type="submit" className="v2-btn v2-btn-primary" style={{ marginTop: 8 }}>Criar Novo Artista (POST)</button>
            </form>

            <form onSubmit={onUpdateArtist} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dashed var(--border-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
               <label className="v2-field"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Para Atualizar: Informe o ID do Artista</span><input style={inputStyle} placeholder="Ex: 2" value={artistId} onChange={(e) => setArtistId(e.target.value)} /></label>
               <button type="submit" className="v2-btn v2-btn-outline">Atualizar Artista por ID (PUT)</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
