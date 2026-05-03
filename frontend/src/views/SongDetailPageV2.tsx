import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getLyrics, getSong, incrementPlay } from '../api/songs'
import { addFavorite, removeFavorite } from '../api/favorites'
import { addSongToPlaylist, getPlaylist, listMyPlaylists } from '../api/playlists'
import type { PlaylistResponse } from '../api/types'
import { useAsync } from '../ui/hooks'

/* ── SVG Icons (light-theme friendly) ─────────────── */

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

function PlayIcon() {
  return <Icon><path d="M6 4v16l12-8-12-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M20 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="translate(-2 0)" /></Icon>
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Icon>
      <path
        d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'} opacity={filled ? 0.92 : 1}
      />
    </Icon>
  )
}

function ListPlusIcon() {
  return <Icon><path d="M4 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M13 14h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="translate(-2 0)" /></Icon>
}

function GuitarIcon() {
  return <Icon><path d="M15.5 8.5c1.6-1.6 3.6-2.1 5-0.7 1.4 1.4.9 3.4-.7 5l-2.2 2.2c-1 1-2.1 1.2-3.2.7l-3.8 3.8c-1.4 1.4-3.6 1.4-5 0-1.4-1.4-1.4-3.6 0-5l3.8-3.8c-.5-1.1-.3-2.2.7-3.2l2.4-2.0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7.5 16.5l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Icon>
}

function ChevronLeftIcon() {
  return <Icon><path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

function ChevronRightIcon() {
  return <Icon><path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

function ArrowLeftIcon() {
  return <Icon size={16}><path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>
}

/* ── Transpose Logic (unchanged from original) ────── */

function rtrim(s: string) { return s.replace(/[ \t]+$/g, '') }

function slugifyFilenamePart(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.replace(/\s+/g, '_').toLowerCase()
}

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

function noteToIndex(note: string): number | null {
  const n = note.trim()
  const idxSharp = NOTES_SHARP.indexOf(n as any)
  if (idxSharp >= 0) return idxSharp
  const idxFlat = NOTES_FLAT.indexOf(n as any)
  if (idxFlat >= 0) return idxFlat
  return null
}

function indexToNote(index: number, preferFlats: boolean): string {
  const normalized = ((index % 12) + 12) % 12
  return preferFlats ? NOTES_FLAT[normalized] : NOTES_SHARP[normalized]
}

function parseLeadingNote(token: string): { note: string; rest: string } | null {
  const m = token.match(/^([A-G])([#b]?)(.*)$/)
  if (!m) return null
  return { note: `${m[1]}${m[2] || ''}`, rest: m[3] || '' }
}

function transposeChordSymbol(chord: string, semitones: number, preferFlats: boolean): string {
  const raw = chord.trim()
  if (!raw) return raw
  if (raw.toUpperCase() === 'N.C.' || raw.toUpperCase() === 'NC') return raw
  const parts = raw.split('/')
  const rootPart = parts[0]
  const bassPart = parts.length > 1 ? parts.slice(1).join('/') : null
  const rootParsed = parseLeadingNote(rootPart)
  if (!rootParsed) return raw
  const rootIndex = noteToIndex(rootParsed.note)
  if (rootIndex === null) return raw
  const rootNew = indexToNote(rootIndex + semitones, preferFlats) + rootParsed.rest
  if (!bassPart) return rootNew
  const bassParsed = parseLeadingNote(bassPart)
  if (!bassParsed) return `${rootNew}/${bassPart}`
  const bassIndex = noteToIndex(bassParsed.note)
  if (bassIndex === null) return `${rootNew}/${bassPart}`
  return `${rootNew}/${indexToNote(bassIndex + semitones, preferFlats) + bassParsed.rest}`
}

function formatChordPro(text: string, transposeSemitones: number, preferFlats: boolean) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  return lines.map((line) => {
    let lyricsLine = ''
    const chordChars: string[] = []
    let i = 0
    while (i < line.length) {
      const ch = line[i]
      if (ch === '[') {
        const close = line.indexOf(']', i + 1)
        if (close === -1) { lyricsLine += ch; i += 1; continue }
        const chordRaw = line.slice(i + 1, close).trim()
        const chord = transposeChordSymbol(chordRaw, transposeSemitones, preferFlats)
        const basePos = lyricsLine.length
        while (chordChars.length < basePos) chordChars.push(' ')
        let pos = basePos
        while (pos < chordChars.length && chordChars[pos] !== ' ') pos += 1
        if (pos > basePos) lyricsLine += ' '.repeat(pos - basePos)
        const writePos = lyricsLine.length
        while (chordChars.length < writePos) chordChars.push(' ')
        while (chordChars.length < writePos + chord.length) chordChars.push(' ')
        for (let k = 0; k < chord.length; k++) chordChars[writePos + k] = chord[k]
        i = close + 1
        continue
      }
      lyricsLine += ch
      i += 1
    }
    const chordRaw = chordChars.join('')
    const chordTrimmed = rtrim(chordRaw)
    const lyricsTrimmed = rtrim(lyricsLine)
    const targetLen = Math.max(chordTrimmed.length, lyricsTrimmed.length)
    return {
      chordLine: chordTrimmed.length ? chordRaw.padEnd(targetLen, ' ') : null,
      lyricsLine: lyricsLine.padEnd(targetLen, ' '),
    }
  })
}

type ChordProLine = { chordLine: string | null; lyricsLine: string }

function chunkChordProLines(lines: ChordProLine[], cols: number | null): ChordProLine[] {
  if (!cols || cols <= 0) return lines
  const out: ChordProLine[] = []
  for (const line of lines) {
    const chord = line.chordLine ?? ''
    const lyrics = line.lyricsLine ?? ''
    const maxLen = Math.max(chord.length, lyrics.length)
    if (maxLen === 0) { out.push({ chordLine: null, lyricsLine: '' }); continue }
    for (let i = 0; i < maxLen; i += cols) {
      const chordSegRaw = chord ? chord.slice(i, i + cols) : ''
      const chordSeg = chordSegRaw && rtrim(chordSegRaw).length ? chordSegRaw : null
      out.push({ chordLine: chordSeg, lyricsLine: lyrics.slice(i, i + cols) })
    }
  }
  return out
}

/* ── Page Component ───────────────────────────────── */

export function SongDetailPageV2() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const id = useMemo(() => Number(params.id), [params.id])
  const state = useAsync(() => getSong(id), [id])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [transpose, setTranspose] = useState(0)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const [myPlaylists, setMyPlaylists] = useState<PlaylistResponse[] | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | ''>('')
  const [addingToPlaylist, setAddingToPlaylist] = useState(false)

  const [playerMode, setPlayerMode] = useState(false)
  const [autoScrollOn, setAutoScrollOn] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(8)
  const [playerControlsHidden, setPlayerControlsHidden] = useState(false)

  const autoScrollSpeedRef = useRef(autoScrollSpeed)
  const autoScrollRemainderRef = useRef(0)
  const [playerBarEl, setPlayerBarEl] = useState<HTMLDivElement | null>(null)

  const [wrapCols, setWrapCols] = useState<number | null>(null)
  const [measureEl, setMeasureEl] = useState<HTMLDivElement | null>(null)

  const playlistId = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    const raw = sp.get('playlistId') || sp.get('playlist')
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  }, [location.search])

  const playlistState = useAsync(
    () => (playlistId ? getPlaylist(playlistId) : Promise.resolve(null)),
    [playlistId],
  )

  const playlistNav = useMemo(() => {
    const pl = playlistState.data
    if (!playlistId || !pl) return null
    const songs = (pl.songs || []).slice().sort((a, b) => a.position - b.position)
    const idx = songs.findIndex((s) => s.id === id)
    if (idx < 0) return null
    return {
      playlistId,
      playlistName: pl.name,
      index: idx,
      total: songs.length,
      prevId: idx > 0 ? songs[idx - 1].id : null,
      nextId: idx < songs.length - 1 ? songs[idx + 1].id : null,
    }
  }, [playlistId, playlistState.data, id])

  function goToPlaylistSong(nextSongId: number) {
    if (!playlistId) { navigate(`/songs/${nextSongId}`); return }
    navigate(`/songs/${nextSongId}?playlistId=${playlistId}`)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  /* ── localStorage persistence (identical logic) ── */
  useEffect(() => {
    try {
      if (localStorage.getItem('igcg.playerMode') === '1') setPlayerMode(true)
      const sp = localStorage.getItem('igcg.autoScrollSpeed')
      if (sp) { const n = Math.round(Number(sp)); if (Number.isFinite(n) && n >= 0 && n <= 80) setAutoScrollSpeed(n) }
      if (localStorage.getItem('igcg.playerControlsHidden') === '1') setPlayerControlsHidden(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { try { localStorage.setItem('igcg.playerMode', playerMode ? '1' : '0') } catch { /* */ } if (!playerMode) setAutoScrollOn(false) }, [playerMode])
  useEffect(() => { try { localStorage.setItem('igcg.autoScrollSpeed', String(autoScrollSpeed)) } catch { /* */ } }, [autoScrollSpeed])
  useEffect(() => { autoScrollSpeedRef.current = autoScrollSpeed }, [autoScrollSpeed])
  useEffect(() => { try { localStorage.setItem('igcg.playerControlsHidden', playerControlsHidden ? '1' : '0') } catch { /* */ } }, [playerControlsHidden])

  /* ── Auto-scroll (identical logic) ── */
  useEffect(() => {
    if (!autoScrollOn) return
    autoScrollRemainderRef.current = 0
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(60, now - last); last = now
      const speed = autoScrollSpeedRef.current
      if (speed <= 0) { setAutoScrollOn(false); return }
      const delta = (speed * dt) / 1000
      const total = autoScrollRemainderRef.current + delta
      const whole = Math.floor(total)
      autoScrollRemainderRef.current = total - whole
      if (whole !== 0) window.scrollBy(0, whole)
      const doc = document.documentElement
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) setAutoScrollOn(false)
      else raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    const stopByWheel = () => setAutoScrollOn(false)
    const stopByTouchIfOutside = (ev: TouchEvent) => {
      if (playerBarEl && ev.target instanceof Node && playerBarEl.contains(ev.target)) return
      setAutoScrollOn(false)
    }
    window.addEventListener('wheel', stopByWheel, { passive: true })
    window.addEventListener('touchstart', stopByTouchIfOutside, { passive: true })
    window.addEventListener('touchmove', stopByTouchIfOutside, { passive: true })
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('wheel', stopByWheel)
      window.removeEventListener('touchstart', stopByTouchIfOutside)
      window.removeEventListener('touchmove', stopByTouchIfOutside)
    }
  }, [autoScrollOn, playerBarEl])

  /* ── Wrap columns (identical logic) ── */
  useEffect(() => {
    if (!measureEl) return
    const el = measureEl
    const mql = window.matchMedia?.('(max-width: 899px)')
    const isMobile = () => mql ? mql.matches : window.innerWidth <= 899
    function computeCols(el: HTMLDivElement): number | null {
      if (!isMobile()) return null
      const style = window.getComputedStyle(el)
      const pl = Number.parseFloat(style.paddingLeft || '0') || 0
      const pr = Number.parseFloat(style.paddingRight || '0') || 0
      const available = el.clientWidth - pl - pr
      if (available <= 0) return null
      const probe = document.createElement('span')
      probe.textContent = '00000000000000000000'
      probe.style.position = 'absolute'; probe.style.visibility = 'hidden'; probe.style.whiteSpace = 'pre'
      probe.style.fontFamily = style.fontFamily; probe.style.fontSize = style.fontSize
      probe.style.fontWeight = style.fontWeight; probe.style.letterSpacing = style.letterSpacing
      document.body.appendChild(probe)
      const charW = probe.getBoundingClientRect().width / 20
      document.body.removeChild(probe)
      if (!charW || charW <= 0) return null
      return Math.max(18, Math.min(Math.floor(available / charW) - 1, 80))
    }
    function update() { setWrapCols(computeCols(el)) }
    update()
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => update()); ro.observe(el) }
    window.addEventListener('resize', update)
    if (mql) {
      const onChange = () => update()
      if ('addEventListener' in mql) { mql.addEventListener('change', onChange); return () => { window.removeEventListener('resize', update); ro?.disconnect(); mql.removeEventListener('change', onChange) } }
    }
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [measureEl])

  /* ── Handlers (identical logic) ── */
  async function ensurePlaylistsLoaded() {
    if (myPlaylists) return
    setPlaylistError(null); setPlaylistLoading(true)
    try { const res = await listMyPlaylists({ limit: 100 }); setMyPlaylists(res); setSelectedPlaylistId(res[0]?.id ?? '') }
    catch (e: any) { setPlaylistError(e?.message || 'Falha ao carregar playlists'); setMyPlaylists([]) }
    finally { setPlaylistLoading(false) }
  }

  async function onAddToPlaylist() {
    if (!selectedPlaylistId) return
    setActionError(null); setActionSuccess(null)
    try { setAddingToPlaylist(true); await addSongToPlaylist(Number(selectedPlaylistId), id); setActionSuccess('Música adicionada na playlist') }
    catch (e: any) { setActionError(e?.message || 'Falha ao adicionar na playlist') }
    finally { setAddingToPlaylist(false) }
  }

  const originalKeyRaw = state.data?.original_key?.trim() || null
  const preferFlats = useMemo(() => originalKeyRaw ? originalKeyRaw.includes('b') : false, [originalKeyRaw])

  const keyInfo = useMemo(() => {
    if (!originalKeyRaw) return null
    const parsed = parseLeadingNote(originalKeyRaw)
    if (!parsed) return null
    const idx = noteToIndex(parsed.note)
    return idx !== null ? { baseIndex: idx, baseNote: parsed.note } : null
  }, [originalKeyRaw])

  const currentKey = useMemo(() => keyInfo ? indexToNote(keyInfo.baseIndex + transpose, preferFlats) : null, [keyInfo, transpose, preferFlats])
  const semitoneLabel = useMemo(() => transpose === 0 ? '0' : transpose > 0 ? `+${transpose}` : String(transpose), [transpose])

  function setTargetKey(targetIndex: number) {
    if (!keyInfo) return
    const diff = (targetIndex - keyInfo.baseIndex + 12) % 12
    setTranspose(diff > 6 ? diff - 12 : diff)
  }

  useEffect(() => {
    if (!state.data) return
    const fromDetail = state.data.lyrics_with_chords || state.data.cifra_content || null
    if (fromDetail) { setLyrics(fromDetail); return }
    ; (async () => { try { const res = await getLyrics(id, { include_chords: true }); setLyrics(res.lyrics) } catch { setLyrics(null) } })()
  }, [id, state.data])

  async function onPlay() {
    setActionError(null); setActionSuccess(null)
    try { const res = await incrementPlay(id); setActionSuccess(`Play incrementado: ${res.play_count}`); state.setData(state.data ? { ...state.data, play_count: res.play_count } : state.data) }
    catch (e: any) { setActionError(e?.message || 'Falha ao incrementar play') }
  }

  const onPlayRef = useRef(onPlay)
  useEffect(() => { onPlayRef.current = onPlay }, [onPlay])

  useEffect(() => {
    const timer = setTimeout(() => {
      onPlayRef.current()
    }, 30000)
    return () => clearTimeout(timer)
  }, [id])

  async function onToggleFavorite() {
    if (!state.data) return
    setActionError(null); setActionSuccess(null)
    try {
      const isFav = Boolean(state.data.is_favorited)
      if (isFav) await removeFavorite(id); else await addFavorite(id)
      state.setData({ ...state.data, is_favorited: !isFav })
      setActionSuccess(!isFav ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch (e: any) { setActionError(e?.message || 'Falha ao atualizar favorito') }
  }

  async function onReloadLyrics() {
    setActionError(null); setActionSuccess(null)
    try { const res = await getLyrics(id, { include_chords: true }); setLyrics(res.lyrics); setActionSuccess('Letra+cifras atualizada') }
    catch (e: any) { setActionError(e?.message || 'Falha ao buscar letra') }
  }

  async function onDownloadPlainLyricsTxt() {
    if (!state.data) return

    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await getLyrics(id, { include_chords: false })
      const plainLyrics = (res.lyrics || '').trim()

      if (!plainLyrics) {
        setActionError('Letra sem cifras indisponível para download')
        return
      }

      const title = state.data.title || res.title || `hino_${id}`
      const artist = state.data.artist_name || res.artist || ''
      const album = res.album || ''

      const content = [
        title,
        artist ? `Artista: ${artist}` : null,
        album ? `Álbum: ${album}` : null,
        '',
        plainLyrics,
      ]
        .filter((line): line is string => line !== null)
        .join('\n')

      const safeBase = slugifyFilenamePart(title) || `hino_${id}`
      const fileName = `${safeBase}_letra.txt`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setActionSuccess('Download da letra sem cifras iniciado')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao gerar download da letra')
    }
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div style={{ paddingBottom: playerMode ? 110 : 0 }}>
      {/* Back nav */}
      {!playerMode && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeftIcon /> Voltar
          </button>
        </div>
      )}

      {/* Alerts */}
      {state.error && <div className="v2-error" style={{ marginBottom: 12 }}>⚠ {state.error}</div>}
      {actionError && <div className="v2-error" style={{ marginBottom: 12 }}>⚠ {actionError}</div>}
      {actionSuccess && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(58, 133, 40, 0.08)', border: '1px solid rgba(58, 133, 40, 0.20)', fontSize: 13, color: 'var(--primary-dark)', animation: 'v2FadeIn 200ms ease' }}>✅ {actionSuccess}</div>}

      {state.loading || !state.data ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '50%', height: 20, marginBottom: 12 }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '30%' }} />
        </div>
      ) : (
        <>
          {/* ── Header Card ── */}
          {!playerMode && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              {/* Title & Artist */}
              <div style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px', color: 'var(--text)' }}>{state.data.title}</h1>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{state.data.artist_name || `artist_id=${state.data.artist_id}`}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => void onPlay()}>
                  <PlayIcon /> Play
                </button>
                <button className={`v2-btn v2-btn-sm ${state.data.is_favorited ? 'v2-btn-primary' : ''}`} onClick={() => void onToggleFavorite()} style={state.data.is_favorited ? { color: '#dc3545', borderColor: 'rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.06)' } : {}}>
                  <HeartIcon filled={Boolean(state.data.is_favorited)} /> Favorito
                </button>
                <button className={`v2-btn v2-btn-sm ${showAddToPlaylist ? 'v2-btn-primary' : ''}`} onClick={() => { const next = !showAddToPlaylist; setShowAddToPlaylist(next); if (next) void ensurePlaylistsLoaded() }}>
                  <ListPlusIcon /> Playlist
                </button>
                <button className="v2-btn v2-btn-sm" onClick={() => setPlayerMode(true)}>
                  <GuitarIcon /> Tocar
                </button>
              </div>

              {/* Meta chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', fontSize: 12, fontWeight: 600, color: 'var(--primary-dark)' }}>
                  {state.data.play_count} plays
                </span>
                {state.data.original_key && <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Tom: {state.data.original_key}</span>}
                {state.data.rhythm && <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Ritmo: {state.data.rhythm}</span>}
              </div>

              {/* Transpose Bar */}
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Tom / Transposição</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {keyInfo && currentKey ? (
                      <>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)' }}>Atual: {currentKey}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Δ {semitoneLabel}</span>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          Mudar tom:
                          <select
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--text)' }}
                            value={((keyInfo.baseIndex + transpose) % 12 + 12) % 12}
                            onChange={(e) => setTargetKey(Number(e.target.value))}
                          >
                            {(preferFlats ? NOTES_FLAT : NOTES_SHARP).map((n, idx) => <option key={n} value={idx}>{n}</option>)}
                          </select>
                        </label>
                      </>
                    ) : (
                      <>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>Δ {semitoneLabel}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(tom original indisponível)</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="v2-btn v2-btn-sm" onClick={() => setTranspose((t) => t - 1)}>−1</button>
                  <button className="v2-btn v2-btn-sm" onClick={() => setTranspose((t) => t + 1)}>+1</button>
                  <button className="v2-btn v2-btn-sm" onClick={() => setTranspose(0)} disabled={transpose === 0}>Reset</button>
                </div>
              </div>

              {/* Add to Playlist Panel */}
              {showAddToPlaylist && (
                <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Adicionar esta música em uma playlist</div>
                  {playlistError && <div className="v2-error" style={{ marginBottom: 8 }}>{playlistError}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      style={{ flex: 1, minWidth: 160, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 13, color: 'var(--text)' }}
                      value={selectedPlaylistId}
                      onChange={(e) => setSelectedPlaylistId(e.target.value ? Number(e.target.value) : '')}
                      disabled={playlistLoading || !myPlaylists || myPlaylists.length === 0}
                    >
                      {playlistLoading && <option>Carregando…</option>}
                      {!playlistLoading && myPlaylists && myPlaylists.length === 0 && <option>Nenhuma playlist</option>}
                      {(myPlaylists || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="v2-btn v2-btn-primary v2-btn-sm" disabled={!selectedPlaylistId || addingToPlaylist} onClick={() => void onAddToPlaylist()}>
                      {addingToPlaylist ? 'Adicionando…' : 'Adicionar'}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Dica: crie uma playlist em <Link to="/playlists" style={{ color: 'var(--primary)', fontWeight: 600 }}>Playlists</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Lyrics + Chords Card ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Letra + Cifras</h2>
              {!playerMode && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="v2-btn v2-btn-sm v2-btn-primary" onClick={() => void onDownloadPlainLyricsTxt()}>
                    Baixar letra .txt
                  </button>
                  <button className="v2-btn v2-btn-sm v2-btn-outline" onClick={() => void onReloadLyrics()}>
                    Atualizar
                  </button>
                </div>
              )}
            </div>

            {state.data.introduction && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Intro:</div>
                <div ref={setMeasureEl} style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', lineHeight: 1.5, marginBottom: 12 }}>
                  {chunkChordProLines(formatChordPro(state.data.introduction, transpose, preferFlats), wrapCols).map((l, idx) => (
                    <div key={`intro-${idx}`}>
                      {l.chordLine && <div style={{ whiteSpace: 'pre', color: 'var(--primary)', fontWeight: 700 }}>{l.chordLine}</div>}
                      <div style={{ whiteSpace: 'pre', color: 'var(--text)' }}>{l.lyricsLine || ' '}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {lyrics ? (
              <div ref={setMeasureEl} style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', lineHeight: 1.5 }}>
                {chunkChordProLines(formatChordPro(lyrics, transpose, preferFlats), wrapCols).map((l, idx) => (
                  <div key={idx}>
                    {l.chordLine && <div style={{ whiteSpace: 'pre', color: 'var(--primary)', fontWeight: 700 }}>{l.chordLine}</div>}
                    <div style={{ whiteSpace: 'pre', color: 'var(--text)' }}>{l.lyricsLine || ' '}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(sem letra/cifras disponíveis)</div>
            )}
          </div>

          {/* ── Player Bar (fixed bottom) ── */}
          {playerMode && (
            <div ref={setPlayerBarEl} role="region" aria-label="Modo tocador" style={{
              position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 50,
              borderRadius: 'var(--radius-lg)', padding: '12px 16px',
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: playerControlsHidden ? 0 : 10 }}>
                <button className="v2-btn v2-btn-sm" onClick={() => setPlayerMode(false)}>Sair</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{state.data.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {state.data.artist_name || `artist_id=${state.data.artist_id}`}
                    {playlistNav ? ` • ${playlistNav.playlistName} (${playlistNav.index + 1}/${playlistNav.total})` : ''}
                  </div>
                </div>
                <button className="v2-btn v2-btn-sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Topo</button>
              </div>

              {/* Bottom row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {playlistNav && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="v2-btn v2-btn-sm" disabled={!playlistNav.prevId} onClick={() => playlistNav.prevId && goToPlaylistSong(playlistNav.prevId)}>
                      <ChevronLeftIcon /> Ant.
                    </button>
                    <button className="v2-btn v2-btn-sm" disabled={!playlistNav.nextId} onClick={() => playlistNav.nextId && goToPlaylistSong(playlistNav.nextId)}>
                      Próx. <ChevronRightIcon />
                    </button>
                  </div>
                )}

                <button className={`v2-btn v2-btn-sm ${autoScrollOn ? 'v2-btn-primary' : ''}`} onClick={() => { if (autoScrollSpeed <= 0) setAutoScrollSpeed(8); setAutoScrollOn((v) => !v) }}>
                  {autoScrollOn ? '⏸ Pausar' : '▶ Auto-scroll'}
                </button>

                <button className="v2-btn v2-btn-sm" onClick={() => setPlayerControlsHidden((v) => !v)}>
                  {playerControlsHidden ? '▼ Mostrar' : '▲ Ocultar'}
                </button>

                {!playerControlsHidden && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vel.</span>
                      <input
                        type="range" min={0} max={40} step={1} value={autoScrollSpeed}
                        onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                        style={{ width: 100, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ color: 'var(--text-muted)', width: 24, textAlign: 'right' }}>{autoScrollSpeed}</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="v2-btn v2-btn-sm" onClick={() => setTranspose((t) => t - 1)}>−</button>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                        {currentKey ? `Tom: ${currentKey}` : `Δ: ${semitoneLabel}`}
                      </span>
                      <button className="v2-btn v2-btn-sm" onClick={() => setTranspose((t) => t + 1)}>+</button>
                    </div>

                    <button className="v2-btn v2-btn-sm" onClick={() => setTranspose(0)} disabled={transpose === 0}>Reset</button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
