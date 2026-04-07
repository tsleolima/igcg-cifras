import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

function SearchIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function navClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'v2-nav-link active' : 'v2-nav-link'
}

export function LayoutV2() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  function handleNavSearch(e: FormEvent) {
    e.preventDefault()
    const q = navSearch.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    setNavSearch('')
  }

  return (
    <div className="v2-app">
      {/* ── Navbar ── */}
      <nav className="v2-navbar" role="navigation" aria-label="Navegação principal">
        <div className="v2-navbar-inner">
          <Link to="/" className="v2-navbar-brand">
            <img className="v2-navbar-logo" src="/igcg-logo.svg" alt="IGCG" />
            <span className="v2-navbar-title">IGCG Cifras</span>
          </Link>

          <div className="v2-navbar-nav">
            <NavLink to="/" end className={navClassName}>Início</NavLink>
            <NavLink to="/songs" className={navClassName}>Cifras</NavLink>
            <NavLink to="/albums" className={navClassName}>Álbuns</NavLink>
            <NavLink to="/artists" className={navClassName}>Artistas</NavLink>
            {user ? (
              <>
                <NavLink to="/playlists" className={navClassName}>Playlists</NavLink>
                <NavLink to="/favorites" className={navClassName}>Favoritas</NavLink>
              </>
            ) : null}
          </div>

          <div className="v2-navbar-spacer" />

          {/* navbar search */}
          <form className="v2-navbar-search" onSubmit={handleNavSearch}>
            <SearchIcon className="v2-navbar-search-icon" />
            <input
              type="search"
              placeholder="Buscar…"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              autoComplete="off"
            />
          </form>

          {/* actions */}
          <div className="v2-navbar-actions">
            {user ? (
              <>
                <Link to="/profile" className="v2-navbar-user" style={{ textDecoration: 'none' }}>
                  <div className="v2-navbar-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {user.username}
                </Link>
                <button className="v2-btn v2-btn-sm v2-btn-outline" onClick={logout} type="button">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="v2-btn v2-btn-sm v2-btn-outline">
                  Entrar
                </Link>
                <Link to="/register" className="v2-btn v2-btn-sm v2-btn-primary">
                  Criar conta
                </Link>
              </>
            )}
          </div>

          {/* mobile menu btn */}
          <button className="v2-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
            <MenuIcon />
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      <div
        className={drawerOpen ? 'v2-mobile-drawer-backdrop open' : 'v2-mobile-drawer-backdrop'}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={drawerOpen ? 'v2-mobile-drawer open' : 'v2-mobile-drawer'}>
        <div className="v2-mobile-drawer-header">
          <Link to="/" className="v2-navbar-brand" onClick={() => setDrawerOpen(false)}>
            <img className="v2-navbar-logo" src="/igcg-logo.svg" alt="IGCG" />
            <span className="v2-navbar-title">IGCG Cifras</span>
          </Link>
          <button className="v2-mobile-close" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
            <CloseIcon />
          </button>
        </div>

        <NavLink to="/" end className={navClassName} onClick={() => setDrawerOpen(false)}>Início</NavLink>
        <NavLink to="/songs" className={navClassName} onClick={() => setDrawerOpen(false)}>Cifras</NavLink>
        <NavLink to="/albums" className={navClassName} onClick={() => setDrawerOpen(false)}>Álbuns</NavLink>
        <NavLink to="/artists" className={navClassName} onClick={() => setDrawerOpen(false)}>Artistas</NavLink>
        {user ? (
          <>
            <NavLink to="/playlists" className={navClassName} onClick={() => setDrawerOpen(false)}>Playlists</NavLink>
            <NavLink to="/favorites" className={navClassName} onClick={() => setDrawerOpen(false)}>Favoritas</NavLink>
            <NavLink to="/search" className={navClassName} onClick={() => setDrawerOpen(false)}>Busca</NavLink>
          </>
        ) : null}

        <div style={{ flex: 1 }} />

        {user ? (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <Link to="/profile" className="v2-navbar-user" onClick={() => setDrawerOpen(false)} style={{ marginBottom: 10, width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              <div className="v2-navbar-avatar">{user.username.charAt(0).toUpperCase()}</div>
              {user.username}
            </Link>
            <button className="v2-btn v2-btn-outline" onClick={() => { logout(); setDrawerOpen(false) }} style={{ width: '100%' }} type="button">
              Sair
            </button>
          </div>
        ) : (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/login" className="v2-btn v2-btn-outline" style={{ justifyContent: 'center' }} onClick={() => setDrawerOpen(false)}>
              Entrar
            </Link>
            <Link to="/register" className="v2-btn v2-btn-primary" style={{ justifyContent: 'center' }} onClick={() => setDrawerOpen(false)}>
              Criar conta
            </Link>
          </div>
        )}
      </aside>

      {/* ── Page Content ── */}
      <main className="v2-page">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="v2-footer">
        IGCG Cifras — Igreja em Campina Grande
      </footer>
    </div>
  )
}
