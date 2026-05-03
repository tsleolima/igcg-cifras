import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'

function IconBase(props: { className?: string; children: React.ReactNode }) {
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
      {props.children}
    </svg>
  )
}

function IconMenu(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></IconBase>
}

function IconSearch(props: { className?: string }) {
  return <IconBase className={props.className}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></IconBase>
}

function IconClose(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></IconBase>
}

function IconHome(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /></IconBase>
}

function IconMusic(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M9 18V5.5l9-2v11.5" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" /></IconBase>
}

function IconDisc(props: { className?: string }) {
  return <IconBase className={props.className}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /></IconBase>
}

function IconList(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M7 6h13" /><path d="M7 12h13" /><path d="M7 18h13" /><rect x="3" y="4.5" width="2" height="3" rx="1" /><rect x="3" y="10.5" width="2" height="3" rx="1" /><rect x="3" y="16.5" width="2" height="3" rx="1" /></IconBase>
}

function IconHeart(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M20.84 4.61c-1.54-1.72-4.09-1.72-5.63 0L12 7.83 8.79 4.61c-1.54-1.72-4.09-1.72-5.63 0-1.72 1.92-1.72 4.98 0 6.9L12 21l8.84-9.49c1.72-1.92 1.72-4.98 0-6.9Z" /></IconBase>
}

function IconStar(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M4 16c3-1 5.5-4 7-9 1.5 5 4 8 9 9" /><path d="M14.5 4.5h4" /><path d="M16.5 2.5v4" /></IconBase>
}

function IconShield(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" /></IconBase>
}

function IconUser(props: { className?: string }) {
  return <IconBase className={props.className}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></IconBase>
}

function IconLogout(props: { className?: string }) {
  return <IconBase className={props.className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></IconBase>
}

function navLinkClassName(opts: { isActive: boolean }) {
  return opts.isActive ? 'nav-link active' : 'nav-link'
}

const pageMeta: Array<{ match: (path: string) => boolean; title: string; subtitle: string }> = [
  { match: (path) => path === '/', title: 'Central de Louvor', subtitle: 'Descubra músicas, cifras e coleções em um visual mais atual.' },
  { match: (path) => path.startsWith('/songs'), title: 'Biblioteca de Músicas', subtitle: 'Repertório pronto para tocar, pesquisar e favoritar.' },
  { match: (path) => path.startsWith('/albums'), title: 'Álbuns', subtitle: 'Organize o catálogo por projetos e coleções.' },
  { match: (path) => path.startsWith('/artists'), title: 'Artistas', subtitle: 'Encontre ministérios, intérpretes e destaques.' },
  { match: (path) => path.startsWith('/playlists'), title: 'Playlists', subtitle: 'Monte sequências para culto, ensaio e devocional.' },
  { match: (path) => path.startsWith('/favorites'), title: 'Favoritos', subtitle: 'Acesse rapidamente o repertório salvo.' },
  { match: (path) => path.startsWith('/search'), title: 'Busca Inteligente', subtitle: 'Pesquise por título, artista ou trecho da letra.' },
  { match: (path) => path.startsWith('/profile'), title: 'Perfil', subtitle: 'Gerencie sua experiência e preferências.' },
  { match: (path) => path.startsWith('/admin'), title: 'Administração', subtitle: 'Controle catálogo, conteúdo e experiência.' },
]

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

  const currentPage = pageMeta.find((item) => item.match(location.pathname)) || pageMeta[0]

  const libraryLinks = [
    { to: '/', label: 'Home', icon: <IconHome className="navIcon" /> },
    { to: '/songs', label: 'Songs', icon: <IconMusic className="navIcon" /> },
    { to: '/songs/top', label: 'Top Songs', icon: <IconStar className="navIcon" /> },
    { to: '/albums', label: 'Albums', icon: <IconDisc className="navIcon" /> },
  ]

  const personalLinks = [
    { to: '/playlists', label: 'Playlists', icon: <IconList className="navIcon" /> },
    { to: '/favorites', label: 'Favorites', icon: <IconHeart className="navIcon" /> },
    { to: '/search', label: 'Busca', icon: <IconSearch className="navIcon" /> },
  ]

  const accountLinks = user
    ? [
        { to: '/profile', label: 'Profile', icon: <IconUser className="navIcon" /> },
        { to: '/admin', label: 'Admin', icon: <IconShield className="navIcon" /> },
      ]
    : [
        { to: '/login', label: 'Login', icon: <IconUser className="navIcon" /> },
        { to: '/register', label: 'Registrar', icon: <IconStar className="navIcon" /> },
      ]

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(min-width: 900px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      setMenuOpen(e.matches)
    }

    setIsDesktop(mql.matches)
    setMenuOpen(mql.matches)

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
              <div className="subtitle">Louvor, cifras e playlists</div>
            </div>
          </div>

          {!isDesktop ? (
            <button className="iconBtn sidebarClose" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <IconClose className="iconSvg" />
            </button>
          ) : null}
        </div>

        <nav className="sidebarNav" onClick={() => { if (!isDesktop) setMenuOpen(false) }}>
          <div className="navGroup">
            <div className="navSectionLabel">Biblioteca</div>
            {libraryLinks.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClassName}>
                <span className="navIconWrap">{item.icon}</span>
                <span className="navLabel">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="navGroup">
            <div className="navSectionLabel">Seu espaço</div>
            {personalLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                <span className="navIconWrap">{item.icon}</span>
                <span className="navLabel">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="navGroup">
            <div className="navSectionLabel">Conta</div>
            {accountLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                <span className="navIconWrap">{item.icon}</span>
                <span className="navLabel">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebarFooter">
          {user ? (
            <div className="accountPanel">
              <div className="accountPanelTop">
                <div className="accountAvatar">{user.username.slice(0, 1).toUpperCase()}</div>
                <div className="accountMeta">
                  <span className="accountEyebrow">logado como</span>
                  <span className="accountName">{user.username}</span>
                </div>
              </div>

              <button className="logoutBtn" onClick={logout}>
                <IconLogout className="logoutIcon" />
                <span>Sair da conta</span>
              </button>
            </div>
          ) : (
            <div className="accountPanel accountPanelLoggedOut">
              <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Não autenticado</div>
            </div>
          )}
        </div>
      </aside>

      <div className="appContent">
        <header className="desktopTopbar" aria-label="Topo da página">
          <div className="topbarMeta">
            <div className="topbarEyebrow">IGCG Music</div>
            <div className="topbarTitle">{currentPage.title}</div>
            <div className="topbarSubtitle">{currentPage.subtitle}</div>
          </div>

          <div className="topbarActions">
            <Link to="/songs" className="topbarGhostLink">Biblioteca</Link>
            <Link to="/search" className="topbarPrimaryLink">
              <IconSearch className="iconSvg" />
              Buscar cifra
            </Link>
          </div>
        </header>

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

        <main className="main mainSurface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
