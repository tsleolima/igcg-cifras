import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

/**
 * Modal glassmorphism exibido quando o usuário tenta acessar
 * uma cifra sem estar logado.
 */
export function LoginRequiredModal(props: { onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Se de alguma forma o user já logou enquanto o modal estava aberto
  if (user) {
    props.onClose()
    return null
  }

  return (
    <div className="v2-modal-overlay" onClick={props.onClose} role="dialog" aria-modal="true" aria-label="Login necessário">
      <div className="v2-modal-backdrop" />
      <div className="v2-modal" onClick={(e) => e.stopPropagation()}>
        <div className="v2-modal-icon">🔒</div>
        <h2 className="v2-modal-title v2-heading">Login necessário</h2>
        <p className="v2-modal-text">
          Para visualizar cifras, letras e acessar todos os recursos,
          você precisa estar conectado à sua conta.
        </p>
        <div className="v2-modal-actions">
          <button className="v2-btn" onClick={props.onClose} type="button">
            Cancelar
          </button>
          <button
            className="v2-btn v2-btn-primary"
            onClick={() => { props.onClose(); navigate('/login') }}
            type="button"
          >
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  )
}
