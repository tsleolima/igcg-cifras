import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { LoginRequiredModal } from './LoginRequiredModal'

/**
 * Link inteligente para cifras:
 * - Logado  → navega normalmente para a rota
 * - Guest   → exibe o LoginRequiredModal
 */
export function SongLink(props: { to: string; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (user) {
    return (
      <Link to={props.to} className={props.className} style={props.style}>
        {props.children}
      </Link>
    )
  }

  return (
    <>
      <a
        href={props.to}
        className={props.className}
        style={props.style}
        onClick={(e) => {
          e.preventDefault()
          setShowModal(true)
        }}
      >
        {props.children}
      </a>
      {showModal ? <LoginRequiredModal onClose={() => setShowModal(false)} /> : null}
    </>
  )
}
