import { LogIn } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { useUI } from '../store/UIContext'
import { Avatar } from './Avatar'

/** Shown after "Log out". Signing back in needs no password: this client has no server to check one against. */
export function LoggedOut() {
  const { state } = useStore()
  const { logIn } = useUI()
  return (
    <div className="logged-out">
      <div className="logged-out-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30">
              <path d="M5 3h7v10.5h8V3h7v14H5zM5 19h22v10h-7V23h-8v6H5z" fill="#fff" />
            </svg>
          </span>
          <span>HOSTINGER</span>
          <span className="brand-sep">|</span>
          <span className="brand-product">Mail</span>
        </div>
        <h1>You have been logged out</h1>
        <p>Your mailbox stays on this device. Log in again to continue where you left off.</p>
        <div className="account">
          <Avatar name={state.settings.displayName} me />
          <div>
            <strong>{state.settings.displayName}</strong>
            <span>{state.settings.email}</span>
          </div>
        </div>
        <button className="btn-primary" onClick={logIn}>
          <LogIn size={20} /> Log in
        </button>
        <p className="fine">Demo mailbox. No password is required and nothing is sent to a server.</p>
      </div>
    </div>
  )
}
