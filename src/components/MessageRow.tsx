import { CalendarDays, Paperclip, Star } from 'lucide-react'
import { memo } from 'react'
import { useStore } from '../store/StoreContext'
import { folderLabel } from '../store/queries'
import type { Message } from '../types'
import { formatListDate, snippetOf } from '../utils/format'
import { Checkbox } from './Checkbox'

interface Props {
  message: Message
  selected: boolean
  checked: boolean
  showFolder?: boolean
  onOpen: () => void
  onCheck: (next: boolean) => void
  onStar: () => void
}

export const MessageRow = memo(function MessageRow({ message: m, selected, checked, showFolder, onOpen, onCheck, onStar }: Props) {
  const { state } = useStore()
  const outgoing = m.folder === 'sent' || m.folder === 'drafts' || m.folder === 'scheduled'
  const who = outgoing ? (m.to.length ? `To: ${m.to.map((t) => t.name || t.email).join(', ')}` : 'To: (no recipient)') : m.from.name || m.from.email
  const compact = state.settings.density === 'compact'
  const classes = ['row', m.read ? 'read' : '', selected ? 'selected' : '', checked ? 'checked' : '', compact ? 'compact' : ''].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`${who}: ${m.subject}${m.read ? '' : ' (unread)'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="row-check">
        <Checkbox checked={checked} onChange={onCheck} label={`Select message from ${who}`} />
      </div>
      <div className="row-main">
        <div className="row-sender">
          {m.folder === 'drafts' && <span style={{ color: 'var(--danger)' }}>Draft · </span>}
          {who}
          {showFolder && <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13, marginLeft: 8 }}>{folderLabel(m.folder, state.customFolders)}</span>}
        </div>
        <div className="row-subject">{m.subject || '(no subject)'}</div>
        {state.settings.showSnippets && <div className="row-snippet">{snippetOf(m.body, 90)}</div>}
      </div>
      <div className="row-side">
        <div className="row-meta">
          {m.hasCalendarInvite && (
            <span className="meta-icon" title="Calendar invitation">
              <CalendarDays size={18} />
            </span>
          )}
          {m.attachments.length > 0 && (
            <span className="meta-icon" title={`${m.attachments.length} attachment${m.attachments.length === 1 ? '' : 's'}`}>
              <Paperclip size={18} />
            </span>
          )}
          <span>{formatListDate(m.scheduledFor ?? m.date)}</span>
          <span className={`unread-dot ${m.read ? 'hidden' : ''}`} aria-hidden="true" />
        </div>
        <button
          className={`star-btn ${m.starred ? 'on' : ''}`}
          aria-label={m.starred ? 'Unstar' : 'Star'}
          aria-pressed={m.starred}
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
        >
          <Star size={20} fill={m.starred ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  )
})
