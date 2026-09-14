import { Check, Copy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import { Modal } from './Modal'
import { SettingsModal } from './SettingsModal'

export function Modals() {
  const { modal, closeModal } = useUI()
  switch (modal) {
    case 'settings':
      return <SettingsModal onClose={closeModal} />
    case 'setup':
      return <SetupGuide onClose={closeModal} />
    case 'shortcuts':
      return <Shortcuts onClose={closeModal} />
    case 'refer':
      return <Refer onClose={closeModal} />
    case 'upgrade':
      return <Upgrade onClose={closeModal} />
    case 'feedback':
      return <Feedback onClose={closeModal} />
    default:
      return null
  }
}

function SetupGuide({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const { openModal, openCompose } = useUI()
  const { push } = useToast()
  const done = state.setupSteps.filter((s) => s.done).length
  const pct = Math.round((done / state.setupSteps.length) * 100)

  const act = (id: string) => {
    switch (id) {
      case 'signature':
        openModal('settings')
        return
      case 'folders':
        onClose()
        push('Use the + next to Folders in the sidebar')
        return
      case 'import':
        onClose()
        window.location.hash = ''
        push('Go to Contacts and choose "New contact"')
        return
      case 'mobile':
        push('IMAP: imap.hostinger.com:993 · SMTP: smtp.hostinger.com:465')
        dispatch({ type: 'completeSetupStep', id })
        return
      case 'filters':
        push('Filter rules are managed in hPanel in this demo')
        dispatch({ type: 'completeSetupStep', id })
        return
      case 'alias':
        openCompose({ to: 'support@hostinger.example', subject: 'Add an alias address', body: 'Hi, I would like to add an alias for my mailbox.' })
        dispatch({ type: 'completeSetupStep', id })
        onClose()
        return
      default:
        dispatch({ type: 'completeSetupStep', id })
    }
  }

  return (
    <Modal title={`Setup guide ${done}/${state.setupSteps.length}`} onClose={onClose}>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Finish these steps to get the most out of your mailbox.</p>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="steps">
        {state.setupSteps.map((s) => (
          <button key={s.id} className={`step ${s.done ? 'done' : ''}`} onClick={() => !s.done && act(s.id)} disabled={s.done}>
            <span className={`step-check ${s.done ? 'done' : ''}`}>{s.done && <Check size={16} strokeWidth={3} />}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['c', 'New message'],
    ['/', 'Search mail'],
    ['j / ↓', 'Next message'],
    ['k / ↑', 'Previous message'],
    ['s', 'Star / unstar'],
    ['u', 'Toggle read'],
    ['Del / #', 'Delete'],
    ['Esc', 'Clear selection / close'],
    ['Ctrl + Enter', 'Send message'],
    ['?', 'This help'],
  ]
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className="shortcuts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <span>{v}</span>
            <span className="kbd">{k}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Refer({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const { push } = useToast()
  const link = `https://hostinger.example/referral/${state.settings.email.split('@')[0]}`
  const [copied, setCopied] = useState(false)
  return (
    <Modal title="Refer a friend" onClose={onClose}>
      <p style={{ marginTop: 0 }}>Share your link. Your friend gets 20% off their first order and you earn a commission on every purchase.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" readOnly value={link} aria-label="Referral link" onFocus={(e) => e.target.select()} />
        <button
          className="btn-primary small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              setCopied(true)
              push('Link copied')
            } catch {
              push('Copy failed. Select the link and copy it manually.')
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </Modal>
  )
}

function Upgrade({ onClose }: { onClose: () => void }) {
  const { push } = useToast()
  const plans = [
    { name: 'Business Starter', storage: '10 GB', price: '$0.99/mo', current: true },
    { name: 'Business Premium', storage: '50 GB', price: '$2.99/mo', current: false },
  ]
  return (
    <Modal title="Upgrade storage" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        {plans.map((p) => (
          <div key={p.name} className="toggle-row" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div className="toggle-text">
              <strong>{p.name}</strong>
              <span>
                {p.storage} per mailbox · {p.price}
              </span>
            </div>
            {p.current ? (
              <span className="chip active" style={{ height: 30, padding: '0 12px', fontSize: 13 }}>
                Current plan
              </span>
            ) : (
              <button className="btn-primary small" onClick={() => { push('Upgrades are handled in hPanel in this demo'); onClose() }}>
                Choose
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Feedback({ onClose }: { onClose: () => void }) {
  const { push } = useToast()
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    push('Thanks for the feedback!')
    onClose()
  }
  return (
    <Modal
      title="Send feedback"
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline small" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary small" type="submit" form="feedback-form" disabled={!text.trim() && rating === null}>
            Send
          </button>
        </>
      }
    >
      <form id="feedback-form" onSubmit={submit}>
        <div className="field">
          <label>How is your experience with Hostinger Mail?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} className={`chip ${rating === n ? 'active' : ''}`} onClick={() => setRating(n)} aria-label={`${n} out of 5`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="fb-text">Tell us more</label>
          <textarea id="fb-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="What works well? What is missing?" />
        </div>
      </form>
    </Modal>
  )
}
