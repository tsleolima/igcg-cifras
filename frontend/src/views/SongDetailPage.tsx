import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getLyrics, getSong, incrementPlay } from '../api/songs'
import { addFavorite, removeFavorite } from '../api/favorites'
import { addSongToPlaylist, getPlaylist, listMyPlaylists } from '../api/playlists'
import type { PlaylistResponse } from '../api/types'
import { useAsync } from '../ui/hooks'
import { ErrorBanner, SuccessBanner } from '../ui/Feedback'

type SearchMode = 'all' | 'songs' | 'artists' | 'playlists'

type SearchSnapshot = {
  q: string
  mode: SearchMode
  page: number
  allPages: {
    songs: number
    artists: number
    playlists: number
  }
  scrollY: number
}

type SongDetailLocationState = {
  searchSnapshot?: SearchSnapshot
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="songActionIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

function PlayPlusIcon() {
  return (
    <Icon>
      <path d="M6 4v16l12-8-12-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="translate(-2 0)" />
    </Icon>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <Icon>
        <path
          d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
          fill="currentColor"
          opacity="0.92"
        />
      </Icon>
    )
  }

  return (
    <Icon>
      <path
        d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Icon>
  )
}

function ListPlusIcon() {
  return (
    <Icon>
      <path d="M4 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 14h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="translate(-2 0)" />
    </Icon>
  )
}

function GuitarIcon() {
  return (
    <Icon>
      <path
        d="M15.5 8.5c1.6-1.6 3.6-2.1 5-0.7 1.4 1.4.9 3.4-.7 5l-2.2 2.2c-1 1-2.1 1.2-3.2.7l-3.8 3.8c-1.4 1.4-3.6 1.4-5 0-1.4-1.4-1.4-3.6 0-5l3.8-3.8c-.5-1.1-.3-2.2.7-3.2l2.4-2.0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7.5 16.5l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  )
}

function ChevronLeftIcon() {
  return (
    <Icon>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function ChevronRightIcon() {
  return (
    <Icon>
      <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function rtrim(s: string) {
  return s.replace(/[ \t]+$/g, '')
}

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
  const note = `${m[1]}${m[2] || ''}`
  const rest = m[3] || ''
  return { note, rest }
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
  const bassNew = indexToNote(bassIndex + semitones, preferFlats) + bassParsed.rest
  return `${rootNew}/${bassNew}`
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
        if (close === -1) {
          lyricsLine += ch
          i += 1
          continue
        }

        const chordRaw = line.slice(i + 1, close).trim()
        const chord = transposeChordSymbol(chordRaw, transposeSemitones, preferFlats)
        const basePos = lyricsLine.length

        // Ensure chordChars length to basePos.
        while (chordChars.length < basePos) chordChars.push(' ')

        // If this position is already occupied (e.g. [G][D]), shift right a little.
        let pos = basePos
        while (pos < chordChars.length && chordChars[pos] !== ' ') pos += 1

        // If we shifted, keep lyrics alignment by inserting spaces.
        if (pos > basePos) {
          const delta = pos - basePos
          lyricsLine += ' '.repeat(delta)
        }

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

    // Keep chord+lyrics aligned for wrapping: pad both to same length.
    // We only trim for the "is empty" check; we keep actual strings padded.
    const chordRaw = chordChars.join('')
    const chordTrimmed = rtrim(chordRaw)
    const lyricsTrimmed = rtrim(lyricsLine)
    const targetLen = Math.max(chordTrimmed.length, lyricsTrimmed.length)

    const chordLine = chordTrimmed.length ? chordRaw.padEnd(targetLen, ' ') : null
    const paddedLyricsLine = lyricsLine.padEnd(targetLen, ' ')

    return {
      chordLine,
      lyricsLine: paddedLyricsLine,
    }
  })
}

type ChordProLine = {
  chordLine: string | null
  lyricsLine: string
}

function chunkChordProLines(lines: ChordProLine[], cols: number | null): ChordProLine[] {
  if (!cols || cols <= 0) return lines
  const out: ChordProLine[] = []
  for (const line of lines) {
    const chord = line.chordLine ?? ''
    const lyrics = line.lyricsLine ?? ''
    const maxLen = Math.max(chord.length, lyrics.length)
    if (maxLen === 0) {
      out.push({ chordLine: null, lyricsLine: '' })
      continue
    }
    for (let i = 0; i < maxLen; i += cols) {
      const chordSegRaw = chord ? chord.slice(i, i + cols) : ''
      const chordSeg = chordSegRaw && rtrim(chordSegRaw).length ? chordSegRaw : null
      const lyricsSegRaw = lyrics.slice(i, i + cols)
      out.push({ chordLine: chordSeg, lyricsLine: lyricsSegRaw })
    }
  }
  return out
}

export function SongDetailPage() {
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
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(8) // px/s
  const [playerControlsHidden, setPlayerControlsHidden] = useState(false)

  const autoScrollSpeedRef = useRef(autoScrollSpeed)
  const autoScrollRemainderRef = useRef(0)
  const [playerBarEl, setPlayerBarEl] = useState<HTMLDivElement | null>(null)

  const [wrapCols, setWrapCols] = useState<number | null>(null)
  const [measureEl, setMeasureEl] = useState<HTMLDivElement | null>(null)
  const searchSnapshot = (location.state as SongDetailLocationState | null)?.searchSnapshot

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
    if (!playlistId) {
      navigate(`/songs/${nextSongId}`)
      return
    }
    navigate(`/songs/${nextSongId}?playlistId=${playlistId}`)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  useEffect(() => {
    try {
      const pm = localStorage.getItem('igcg.playerMode')
      if (pm === '1') setPlayerMode(true)
      const sp = localStorage.getItem('igcg.autoScrollSpeed')
      if (sp) {
        const n = Math.round(Number(sp))
        if (Number.isFinite(n) && n >= 0 && n <= 80) setAutoScrollSpeed(n)
      }
      const hidden = localStorage.getItem('igcg.playerControlsHidden')
      if (hidden === '1') setPlayerControlsHidden(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('igcg.playerMode', playerMode ? '1' : '0')
    } catch {
      // ignore
    }

    // Safety: turning player mode off stops auto-scroll.
    if (!playerMode) setAutoScrollOn(false)
  }, [playerMode])

  useEffect(() => {
    try {
      localStorage.setItem('igcg.autoScrollSpeed', String(autoScrollSpeed))
    } catch {
      // ignore
    }
  }, [autoScrollSpeed])

  useEffect(() => {
    autoScrollSpeedRef.current = autoScrollSpeed
  }, [autoScrollSpeed])

  useEffect(() => {
    try {
      localStorage.setItem('igcg.playerControlsHidden', playerControlsHidden ? '1' : '0')
    } catch {
      // ignore
    }
  }, [playerControlsHidden])

  useEffect(() => {
    if (!autoScrollOn) return

    autoScrollRemainderRef.current = 0

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(60, now - last) // cap large jumps
      last = now

      const speed = autoScrollSpeedRef.current
      if (speed <= 0) {
        setAutoScrollOn(false)
        return
      }

      // iOS/Safari often won't scroll with sub-pixel deltas. Accumulate remainders
      // and scroll in whole pixels to make low speeds (e.g. 1-10) work.
      const delta = (speed * dt) / 1000
      const total = autoScrollRemainderRef.current + delta
      const whole = Math.floor(total)
      autoScrollRemainderRef.current = total - whole
      if (whole !== 0) window.scrollBy(0, whole)

      const doc = document.documentElement
      const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 2
      if (!atBottom) raf = window.requestAnimationFrame(tick)
      else setAutoScrollOn(false)
    }

    raf = window.requestAnimationFrame(tick)

    const stopByWheel = () => setAutoScrollOn(false)
    const stopByTouchIfOutside = (ev: TouchEvent) => {
      const target = ev.target
      if (playerBarEl && target instanceof Node && playerBarEl.contains(target)) return
      setAutoScrollOn(false)
    }

    window.addEventListener('wheel', stopByWheel, { passive: true })
    // Keep autoscroll running while adjusting the slider/buttons.
    window.addEventListener('touchstart', stopByTouchIfOutside, { passive: true })
    window.addEventListener('touchmove', stopByTouchIfOutside, { passive: true })

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('wheel', stopByWheel)
      window.removeEventListener('touchstart', stopByTouchIfOutside)
      window.removeEventListener('touchmove', stopByTouchIfOutside)
    }
  }, [autoScrollOn, playerBarEl])

  useEffect(() => {
    if (!measureEl) return
    const el = measureEl

    function computeColsFromElement(el: HTMLDivElement): number | null {
      const style = window.getComputedStyle(el)
      const pl = Number.parseFloat(style.paddingLeft || '0') || 0
      const pr = Number.parseFloat(style.paddingRight || '0') || 0
      const available = el.clientWidth - pl - pr
      if (available <= 0) return null

      const probe = document.createElement('span')
      probe.textContent = '00000000000000000000'
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.style.whiteSpace = 'pre'
      probe.style.fontFamily = style.fontFamily
      probe.style.fontSize = style.fontSize
      probe.style.fontWeight = style.fontWeight
      probe.style.letterSpacing = style.letterSpacing
      document.body.appendChild(probe)
      const charW = probe.getBoundingClientRect().width / 20
      document.body.removeChild(probe)

      if (!charW || charW <= 0) return null

      // Keep a small safety margin so we don't overflow.
      const cols = Math.floor(available / charW) - 1
      return Math.max(18, Math.min(cols, 140))
    }

    function update() {
      setWrapCols(computeColsFromElement(el))
    }

    update()

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      ro.observe(el)
    }

    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [measureEl])

  async function ensurePlaylistsLoaded() {
    if (myPlaylists) return
    setPlaylistError(null)
    setPlaylistLoading(true)
    try {
      const res = await listMyPlaylists({ limit: 100 })
      setMyPlaylists(res)
      setSelectedPlaylistId(res[0]?.id ?? '')
    } catch (e: any) {
      setPlaylistError(e?.message || 'Falha ao carregar playlists')
      setMyPlaylists([])
    } finally {
      setPlaylistLoading(false)
    }
  }

  async function onAddToPlaylist() {
    if (!selectedPlaylistId) return
    setActionError(null)
    setActionSuccess(null)
    try {
      setAddingToPlaylist(true)
      await addSongToPlaylist(Number(selectedPlaylistId), id)
      setActionSuccess('Música adicionada na playlist')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao adicionar na playlist')
    } finally {
      setAddingToPlaylist(false)
    }
  }

  const originalKeyRaw = state.data?.original_key?.trim() || null
  const preferFlats = useMemo(() => {
    if (!originalKeyRaw) return false
    return originalKeyRaw.includes('b')
  }, [originalKeyRaw])

  const keyInfo = useMemo(() => {
    if (!originalKeyRaw) return null
    const parsed = parseLeadingNote(originalKeyRaw)
    if (!parsed) return null
    const idx = noteToIndex(parsed.note)
    if (idx === null) return null
    return { baseIndex: idx, baseNote: parsed.note }
  }, [originalKeyRaw])

  const currentKey = useMemo(() => {
    if (!keyInfo) return null
    return indexToNote(keyInfo.baseIndex + transpose, preferFlats)
  }, [keyInfo, transpose, preferFlats])

  const semitoneLabel = useMemo(() => {
    if (transpose === 0) return '0'
    return transpose > 0 ? `+${transpose}` : String(transpose)
  }, [transpose])

  function setTargetKey(targetIndex: number) {
    if (!keyInfo) return
    const diff = (targetIndex - keyInfo.baseIndex + 12) % 12
    const best = diff > 6 ? diff - 12 : diff
    setTranspose(best)
  }

  useEffect(() => {
    if (!state.data) return
    // Verdade atual: lyrics_with_chords (quando existir).
    const fromDetail = state.data.lyrics_with_chords || state.data.cifra_content || null
    if (fromDetail) {
      setLyrics(fromDetail)
      return
    }
    // Fallback: buscar via endpoint /lyrics já com chords.
    ;(async () => {
      try {
        const res = await getLyrics(id, { include_chords: true })
        setLyrics(res.lyrics)
      } catch {
        setLyrics(null)
      }
    })()
  }, [id, state.data])

  async function onPlay() {
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await incrementPlay(id)
      setActionSuccess(`Play incrementado: ${res.play_count}`)
      state.setData(state.data ? { ...state.data, play_count: res.play_count } : state.data)
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao incrementar play')
    }
  }

  async function onToggleFavorite() {
    if (!state.data) return
    setActionError(null)
    setActionSuccess(null)
    try {
      const isFav = Boolean(state.data.is_favorited)
      if (isFav) await removeFavorite(id)
      else await addFavorite(id)
      state.setData({ ...state.data, is_favorited: !isFav })
      setActionSuccess(!isFav ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao atualizar favorito')
    }
  }

  // Keeping checkFavorite imported for potential future quick-check UI.

  async function onReloadLyrics() {
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await getLyrics(id, { include_chords: true })
      setLyrics(res.lyrics)
      setActionSuccess('Letra+cifras atualizada')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao buscar letra')
    }
  }

  async function onDownloadPlainLyricsTxt() {
    if (!state.data) return

    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await getLyrics(id, { include_chords: false })
      const plainLyrics = (res.lyrics || '').trim()

      if (!plainLyrics) {
        setActionError('Letra sem acordes indisponível para download')
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
        .filter((line) => line !== null)
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

      setActionSuccess('Download da letra sem acordes iniciado')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao gerar download da letra')
    }
  }

  return (
    <div className={playerMode ? 'songDetail playerMode' : 'songDetail'}>
      {!playerMode ? (
        <div className="muted songBackLink" style={{ marginBottom: 10 }}>
          {searchSnapshot ? (
            <Link to="/search" state={{ searchSnapshot }}>← Voltar para busca</Link>
          ) : (
            <Link to="/songs">← Voltar</Link>
          )}
        </div>
      ) : null}

      {state.error ? <ErrorBanner message={state.error} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {actionSuccess ? <SuccessBanner message={actionSuccess} /> : null}

      {state.loading || !state.data ? (
        <div className="card"><div className="muted">Carregando…</div></div>
      ) : (
        <>
          {!playerMode ? (
            <>
              <div className="card songHeroCard">
                <div className="cardTitle">
                  <div className="songHeroMain">
                    <div className="heroBadge">Detalhe do hino</div>
                    <div className="h3">{state.data.title}</div>
                    <div className="muted songHeroSub" style={{ fontSize: 13 }}>
                      {state.data.artist_name || `artist_id=${state.data.artist_id}`}
                    </div>
                  </div>
                  <div className="songHeaderActions">
                    <button className="songActionBtn primary" onClick={() => void onPlay()} aria-label="Incrementar play">
                      <PlayPlusIcon />
                      <span className="songActionLabel">Play</span>
                    </button>

                    <button
                      className={state.data.is_favorited ? 'songActionBtn isActive' : 'songActionBtn'}
                      onClick={() => void onToggleFavorite()}
                      aria-label={state.data.is_favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <HeartIcon filled={Boolean(state.data.is_favorited)} />
                      <span className="songActionLabel">Favorito</span>
                    </button>

                    <button
                      className={showAddToPlaylist ? 'songActionBtn isActive' : 'songActionBtn'}
                      onClick={() => {
                        const next = !showAddToPlaylist
                        setShowAddToPlaylist(next)
                        if (next) void ensurePlaylistsLoaded()
                      }}
                      aria-label="Adicionar na playlist"
                    >
                      <ListPlusIcon />
                      <span className="songActionLabel">Playlist</span>
                    </button>

                    <button className="songActionBtn" onClick={() => setPlayerMode(true)} aria-label="Entrar no modo tocador">
                      <GuitarIcon />
                      <span className="songActionLabel">Tocar</span>
                    </button>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div className="chips songMetaChips">
                  <span className="chip accent">Plays: {state.data.play_count}</span>
                  {state.data.original_key ? <span className="chip">Tom: {state.data.original_key}</span> : null}
                  {state.data.rhythm ? <span className="chip">Ritmo: {state.data.rhythm}</span> : null}
                </div>

                <div style={{ height: 12 }} />

                <div className="transposeBar">
                  <div className="transposeLeft">
                    <div className="muted" style={{ fontSize: 12 }}>Tom / Transposição</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {keyInfo && currentKey ? (
                        <>
                          <span className="chip">Atual: <b>{currentKey}</b></span>
                          <span className="chip">Δ semitons: <b>{semitoneLabel}</b></span>
                          <label className="muted" style={{ fontSize: 12 }}>
                            Mudar tom:
                            <select
                              className="selectSmall"
                              value={((keyInfo.baseIndex + transpose) % 12 + 12) % 12}
                              onChange={(e) => setTargetKey(Number(e.target.value))}
                            >
                              {(preferFlats ? NOTES_FLAT : NOTES_SHARP).map((n, idx) => (
                                <option key={n} value={idx}>{n}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <>
                          <span className="chip">Δ semitons: <b>{semitoneLabel}</b></span>
                          <span className="muted" style={{ fontSize: 12 }}>(tom original indisponível)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="transposeControls">
                    <button className="btnSmall" onClick={() => setTranspose((t) => t - 1)}>-1</button>
                    <button className="btnSmall" onClick={() => setTranspose((t) => t + 1)}>+1</button>
                    <button className="btnSmall" onClick={() => setTranspose(0)} disabled={transpose === 0}>Reset</button>
                  </div>
                </div>

                {showAddToPlaylist ? (
                  <>
                    <div style={{ height: 12 }} />
                    <div className="playlistAddBar">
                      <div className="muted" style={{ fontSize: 12 }}>Adicionar esta música em uma playlist</div>
                      {playlistError ? <div className="muted" style={{ fontSize: 12, color: 'rgba(239, 68, 68, 0.9)' }}>{playlistError}</div> : null}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          value={selectedPlaylistId}
                          onChange={(e) => setSelectedPlaylistId(e.target.value ? Number(e.target.value) : '')}
                          disabled={playlistLoading || !myPlaylists || myPlaylists.length === 0}
                          style={{ maxWidth: 420 }}
                        >
                          {playlistLoading ? <option>Carregando…</option> : null}
                          {!playlistLoading && myPlaylists && myPlaylists.length === 0 ? <option>Nenhuma playlist encontrada</option> : null}
                          {(myPlaylists || []).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        <button
                          className="primary"
                          disabled={!selectedPlaylistId || addingToPlaylist}
                          onClick={() => void onAddToPlaylist()}
                        >
                          {addingToPlaylist ? 'Adicionando…' : 'Adicionar'}
                        </button>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Dica: crie uma playlist em <Link to="/playlists">Playlists</Link>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div style={{ height: 14 }} />
            </>
          ) : null}

          <div className="card lyricsCard">
            <div className="cardTitle">
              <div>
                <div className="heroBadge">Modo cifra</div>
                <div className="h3">Letra + Cifras</div>
              </div>
              {!playerMode ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="primary" onClick={() => void onDownloadPlainLyricsTxt()}>
                    Baixar letra .txt
                  </button>
                  <button className="primary" onClick={() => void onReloadLyrics()}>Atualizar</button>
                </div>
              ) : null}
            </div>
            <div style={{ height: 10 }} />
            {state.data.introduction ? (
              <>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  <b>Intro:</b>
                </div>
                <div className="monoBlock chordPro" ref={setMeasureEl} style={{ marginBottom: 10 }}>
                  {chunkChordProLines(formatChordPro(state.data.introduction, transpose, preferFlats), wrapCols).map((l, idx) => (
                    <div key={`intro-${idx}`}>
                      {l.chordLine ? <div className="chordLine">{l.chordLine}</div> : null}
                      <div className="lyricsLine">{l.lyricsLine || ' '}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {lyrics ? (
              <div className="monoBlock chordPro" ref={setMeasureEl}>
                {chunkChordProLines(formatChordPro(lyrics, transpose, preferFlats), wrapCols).map((l, idx) => (
                  <div key={idx}>
                    {l.chordLine ? <div className="chordLine">{l.chordLine}</div> : null}
                    <div className="lyricsLine">{l.lyricsLine || ' '}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">(sem letra/cifras disponíveis)</div>
            )}
          </div>

          {playerMode ? (
            <div className="playerBar" role="region" aria-label="Modo tocador" ref={setPlayerBarEl}>
              <div className="playerBarTop">
                <button className="playerBtn" onClick={() => setPlayerMode(false)}>Sair</button>
                <div className="playerTitle">
                  <div className="playerSongTitle">{state.data.title}</div>
                  <div className="playerSongMeta">
                    {state.data.artist_name || `artist_id=${state.data.artist_id}`}
                    {playlistNav ? ` • ${playlistNav.playlistName} (${playlistNav.index + 1}/${playlistNav.total})` : ''}
                  </div>
                </div>
                <button className="playerBtn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Topo</button>
              </div>

              <div className="playerBarBottom">
                {playlistNav ? (
                  <div className="playerNav">
                    <button
                      className="playerBtn"
                      disabled={!playlistNav.prevId}
                      onClick={() => playlistNav.prevId && goToPlaylistSong(playlistNav.prevId)}
                      aria-label="Música anterior da playlist"
                      title="Anterior"
                    >
                      <ChevronLeftIcon />
                      Anterior
                    </button>

                    <button
                      className="playerBtn"
                      disabled={!playlistNav.nextId}
                      onClick={() => playlistNav.nextId && goToPlaylistSong(playlistNav.nextId)}
                      aria-label="Próxima música da playlist"
                      title="Próxima"
                    >
                      Próxima
                      <ChevronRightIcon />
                    </button>
                  </div>
                ) : null}

                <button
                  className={autoScrollOn ? 'playerBtn primary' : 'playerBtn'}
                  onClick={() => {
                    if (autoScrollSpeed <= 0) setAutoScrollSpeed(8)
                    setAutoScrollOn((v) => !v)
                  }}
                >
                  {autoScrollOn ? 'Pausar' : 'Auto-scroll'}
                </button>

                <button
                  className="playerBtn"
                  onClick={() => setPlayerControlsHidden((v) => !v)}
                  aria-label={playerControlsHidden ? 'Mostrar controles' : 'Ocultar controles'}
                  title={playerControlsHidden ? 'Mostrar controles' : 'Ocultar controles'}
                >
                  {playerControlsHidden ? 'Mostrar' : 'Ocultar'}
                </button>

                {!playerControlsHidden ? (
                  <>
                    <label className="playerSlider" aria-label="Velocidade do auto-scroll">
                      <span className="muted">Vel.</span>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={1}
                        value={autoScrollSpeed}
                        onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                      />
                      <span className="muted" style={{ width: 40, textAlign: 'right' }}>{autoScrollSpeed}</span>
                    </label>

                    <div className="playerTranspose">
                      <button className="playerBtn" onClick={() => setTranspose((t) => t - 1)}>-</button>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {currentKey ? `Tom: ${currentKey}` : `Δ: ${semitoneLabel}`}
                      </span>
                      <button className="playerBtn" onClick={() => setTranspose((t) => t + 1)}>+</button>
                    </div>

                    <button className="playerBtn" onClick={() => setTranspose(0)} disabled={transpose === 0}>Reset</button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
