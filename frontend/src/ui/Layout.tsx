import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'

function IconMenu(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function IconSearch(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function IconClose(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function navLinkClassName(opts: { isActive: boolean }) {
  return opts.isActive ? 'nav-link active' : 'nav-link'
}

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(min-width: 900px)')?.matches ?? false
  })
  const [menuOpen, setMenuOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(min-width: 900px)')?.matches ?? false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(min-width: 900px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      setMenuOpen(e.matches)
    }

    setIsDesktop(mql.matches)
    setMenuOpen(mql.matches)

    // Safari fallback: addListener/removeListener.
    if ('addEventListener' in mql) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }

    // @ts-expect-error legacy
    mql.addListener(onChange)
    // @ts-expect-error legacy
    return () => mql.removeListener(onChange)
  }, [])

  useEffect(() => {
    // Close drawer when navigating (mobile only).
    if (!isDesktop) setMenuOpen(false)
  }, [isDesktop, location.pathname])

  useEffect(() => {
    if (!menuOpen || isDesktop) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, menuOpen])

  return (
    <div className={menuOpen ? 'appShell menuOpen' : 'appShell'}>
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Menu">
        <div className="sidebarHeader">
          <div className="brand">
            <img className="brandLogo" src="/igcg-logo.svg" alt="IGCG" />
            <div>
              <div className="brandTitle" style={{ fontSize: 16 }}>IGCG Music</div>
              <div className="subtitle">Menu</div>
            </div>
          </div>

          {!isDesktop ? (
            <button className="iconBtn sidebarClose" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <IconClose className="iconSvg" />
            </button>
          ) : null}
        </div>

        <nav className="sidebarNav" onClick={() => { if (!isDesktop) setMenuOpen(false) }}>
          <NavLink to="/" end className={navLinkClassName}>Home</NavLink>

          <div className="nav-sep" />

          <NavLink to="/songs" className={navLinkClassName}>Songs</NavLink>
          <NavLink to="/songs/top" className={navLinkClassName}>Top Songs</NavLink>
          <NavLink to="/albums" className={navLinkClassName}>Albums</NavLink>
          <NavLink to="/artists" className={navLinkClassName}>Artists</NavLink>
          <NavLink to="/artists/top" className={navLinkClassName}>Top Artists</NavLink>

          <div className="nav-sep" />

          <NavLink to="/playlists" className={navLinkClassName}>Playlists</NavLink>
          <NavLink to="/favorites" className={navLinkClassName}>Favorites</NavLink>
          <NavLink to="/search" className={navLinkClassName}>Busca</NavLink>

          <div className="nav-sep" />

          {user ? (
            <>
              <NavLink to="/profile" className={navLinkClassName}>Profile</NavLink>
              <NavLink to="/admin" className={navLinkClassName}>Admin</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClassName}>Login</NavLink>
              <NavLink to="/register" className={navLinkClassName}>Registrar</NavLink>
            </>
          )}
        </nav>

        <div className="sidebarFooter">
          {user ? (
            <>
              <div className="pill" style={{ width: '100%', justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: 12 }}>logado como</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{user.username}</span>
              </div>
              <div style={{ height: 10 }} />
              <button onClick={logout} style={{ width: '100%' }}>Sair</button>
            </>
          ) : (
            <div className="pill" style={{ width: '100%', justifyContent: 'center' }}>
              <span className="muted" style={{ fontSize: 13 }}>Não autenticado</span>
            </div>
          )}
        </div>
      </aside>

      <div className="appContent">
        <header className="mobileTopbar" aria-label="Topo">
          <button
            className="iconBtn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <IconMenu className="iconSvg" />
          </button>

          <div className="mobileBrand" aria-label="IGCG Music">
            <img className="mobileBrandLogo" src="/igcg-logo.svg" alt="IGCG" />
          </div>

          <Link to="/search" className="iconBtn" aria-label="Buscar">
            <IconSearch className="iconSvg" />
          </Link>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
