import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  FolderInput,
  Forward,
  Inbox,
  Mail,
  MoreVertical,
  Printer,
  Reply,
  ReplyAll,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { ME } from '../data/seed'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import { addressesToString } from '../store/reducer'
import { folderLabel } from '../store/queries'
import type { Address, FolderId, Message } from '../types'
import { formatAddress, formatBytes, formatFullDate } from '../utils/format'
import { Avatar } from './Avatar'
import { Menu, MenuItem } from './Menu'

interface Props {
  message: Message
  onBack: () => void
  onTrash: () => void
  onMove: (folder: FolderId) => void
  onRestore: () => void
  onCancelScheduled: () => void
  neighbors: { prev?: Message; next?: Message; open: (m: Message) => void }
}

export function quoteBody(m: Message): string {
  const quoted = m.body
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  return `\n\nOn ${formatFullDate(m.date)}, ${formatAddress(m.from)} wrote:\n${quoted}`
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`
}

export function forwardSubject(subject: string): string {
  return /^fwd?:/i.test(subject) ? subject : `Fwd: ${subject}`
}

function withoutMe(list: Address[]): Address[] {
  return list.filter((a) => a.email.toLowerCase() !== ME.email.toLowerCase())
}

export function MessagePreview({ message: m, onBack, onTrash, onMove, onRestore, onCancelScheduled, neighbors }: Props) {
  const { state, dispatch } = useStore()
  const { openCompose } = useUI()
  const { push } = useToast()
  const [details, setDetails] = useState(false)
  const [rsvp, setRsvp] = useState<string | null>(null)

  const signature = state.settings.signature ? `\n\n${state.settings.signature}` : ''

  const reply = (all: boolean) => {
    const others = all ? withoutMe([...m.to, ...m.cc]) : []
    const to = m.folder === 'sent' ? m.to : [m.from]
    openCompose({
      to: addressesToString(to),
      cc: addressesToString(others.filter((a) => a.email !== m.from.email)),
      subject: replySubject(m.subject),
      body: `${signature}${quoteBody(m)}`,
      inReplyTo: m.id,
    })
  }

  const forward = () => {
    openCompose({
      subject: forwardSubject(m.subject),
      body: `${signature}\n\n---------- Forwarded message ----------\nFrom: ${formatAddress(m.from)}\nDate: ${formatFullDate(m.date)}\nSubject: ${m.subject}\nTo: ${addressesToString(m.to)}\n\n${m.body}`,
      attachments: m.attachments,
      inReplyTo: m.id,
    })
  }

  const download = () => {
    const eml = [
      `From: ${formatAddress(m.from)}`,
      `To: ${addressesToString(m.to)}`,
      m.cc.length ? `Cc: ${addressesToString(m.cc)}` : null,
      `Subject: ${m.subject}`,
      `Date: ${new Date(m.date).toUTCString()}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      m.body,
    ]
      .filter((l) => l !== null)
      .join('\r\n')
    const blob = new Blob([eml], { type: 'message/rfc822' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(m.subject || 'message').replace(/[^\w.-]+/g, '_').slice(0, 60)}.eml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inTrash = m.folder === 'trash'
  const inSpam = m.folder === 'spam'
  const isScheduled = m.folder === 'scheduled'
  const paragraphs = m.body.split(/\n{2,}/)

  return (
    <>
      <div className="preview-toolbar">
        <div className="group">
          <button className="icon-btn plain" aria-label="Back to list" title="Back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          {!isScheduled && (
            <>
              <button className="icon-btn plain" aria-label="Reply" title="Reply (r)" onClick={() => reply(false)}>
                <Reply size={20} />
              </button>
              <button className="icon-btn plain" aria-label="Reply all" title="Reply all" onClick={() => reply(true)}>
                <ReplyAll size={20} />
              </button>
              <button className="icon-btn plain" aria-label="Forward" title="Forward" onClick={forward}>
                <Forward size={20} />
              </button>
            </>
          )}
        </div>
        <div className="group">
          {!isScheduled && (
            <button
              className="icon-btn plain"
              aria-label={m.read ? 'Mark as unread' : 'Mark as read'}
              title={m.read ? 'Mark as unread (u)' : 'Mark as read (u)'}
              onClick={() => {
                dispatch({ type: 'markRead', ids: [m.id], read: !m.read })
                if (m.read) onBack()
              }}
            >
              <Mail size={20} />
            </button>
          )}
          <button className={`icon-btn plain ${m.starred ? 'on' : ''}`} aria-label={m.starred ? 'Unstar' : 'Star'} title="Star (s)" onClick={() => dispatch({ type: 'toggleStar', id: m.id })}>
            <Star size={20} fill={m.starred ? 'currentColor' : 'none'} />
          </button>
          {!isScheduled && (
            <Menu
              align="right"
              trigger={(_open, toggle) => (
                <button className="icon-btn plain" aria-label="Move to folder" title="Move to" onClick={toggle}>
                  <FolderInput size={20} />
                </button>
              )}
            >
              {(close) => (
                <>
                  {m.folder !== 'inbox' && <MenuItem icon={<Inbox size={16} />} label="Inbox" onClick={() => { close(); onMove('inbox') }} />}
                  {state.customFolders.map((f) => (
                    <MenuItem key={f.id} label={f.name} disabled={m.folder === `custom:${f.id}`} onClick={() => { close(); onMove(`custom:${f.id}`) }} />
                  ))}
                </>
              )}
            </Menu>
          )}
          {inSpam ? (
            <button className="icon-btn plain" aria-label="Not spam" title="Not spam" onClick={onRestore}>
              <ShieldCheck size={20} />
            </button>
          ) : (
            !isScheduled && (
              <button className="icon-btn plain" aria-label="Mark as spam" title="Mark as spam" onClick={() => onMove('spam')}>
                <ShieldAlert size={20} />
              </button>
            )
          )}
          {inTrash && (
            <button className="icon-btn plain" aria-label="Restore" title="Restore" onClick={onRestore}>
              <Undo2 size={20} />
            </button>
          )}
          <button className="icon-btn plain" aria-label={inTrash ? 'Delete forever' : 'Delete'} title={inTrash ? 'Delete forever' : 'Delete (Del)'} onClick={onTrash}>
            <Trash2 size={20} />
          </button>
          <Menu
            align="right"
            trigger={(_open, toggle) => (
              <button className="icon-btn plain" aria-label="More actions" onClick={toggle}>
                <MoreVertical size={20} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Printer size={16} />} label="Print" onClick={() => { close(); window.print() }} />
                <MenuItem icon={<Download size={16} />} label="Download (.eml)" onClick={() => { close(); download() }} />
                <MenuItem
                  icon={<ShieldAlert size={16} />}
                  label="Block sender"
                  onClick={() => {
                    close()
                    push(`Future mail from ${m.from.email} will go to Spam`)
                  }}
                />
              </>
            )}
          </Menu>
          <span style={{ width: 8 }} />
          <button className="icon-btn plain" aria-label="Previous message" disabled={!neighbors.prev} onClick={() => neighbors.prev && neighbors.open(neighbors.prev)}>
            <ChevronUp size={20} />
          </button>
          <button className="icon-btn plain" aria-label="Next message" disabled={!neighbors.next} onClick={() => neighbors.next && neighbors.open(neighbors.next)}>
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      <article className="preview-body">
        <h2 className="preview-subject">
          <span style={{ flex: 1 }}>{m.subject || '(no subject)'}</span>
        </h2>

        {inSpam && (
          <div className="preview-notice spam">
            <ShieldAlert size={18} />
            <span>This message is in Spam. Links and images are disabled.</span>
            <span className="spacer" />
            <button className="link-btn" onClick={onRestore}>
              Not spam
            </button>
          </div>
        )}
        {inTrash && (
          <div className="preview-notice trash">
            <Trash2 size={18} />
            <span>This message is in Trash and will be deleted in 30 days.</span>
            <span className="spacer" />
            <button className="link-btn" onClick={onRestore}>
              Restore
            </button>
          </div>
        )}
        {isScheduled && m.scheduledFor && (
          <div className="preview-notice info">
            <Clock size={18} />
            <span>Scheduled to send on {formatFullDate(m.scheduledFor)}.</span>
            <span className="spacer" />
            <button className="link-btn" onClick={onCancelScheduled}>
              Cancel send
            </button>
          </div>
        )}

        <div className="preview-head">
          <Avatar name={m.from.name} email={m.from.email} me={m.from.email === ME.email} />
          <div className="preview-from">
            <div className="name">{m.from.name || m.from.email}</div>
            <div className="email">{m.from.email}</div>
            <div className="to">
              to {m.to.map((t) => t.name || t.email).join(', ') || '(no recipient)'}
              {m.cc.length > 0 && `, cc ${m.cc.map((t) => t.name || t.email).join(', ')}`}
              <button onClick={() => setDetails((d) => !d)} aria-expanded={details}>
                {details ? 'Hide details' : 'Details'}
              </button>
            </div>
          </div>
          <div className="preview-date">{formatFullDate(m.date)}</div>
        </div>

        {details && (
          <dl className="preview-details">
            <dt>From</dt>
            <dd>{formatAddress(m.from)}</dd>
            <dt>To</dt>
            <dd>{addressesToString(m.to) || '—'}</dd>
            {m.cc.length > 0 && (
              <>
                <dt>Cc</dt>
                <dd>{addressesToString(m.cc)}</dd>
              </>
            )}
            <dt>Date</dt>
            <dd>{formatFullDate(m.date)}</dd>
            <dt>Folder</dt>
            <dd>{folderLabel(m.folder, state.customFolders)}</dd>
            <dt>Security</dt>
            <dd>Standard encryption (TLS)</dd>
          </dl>
        )}

        {m.hasCalendarInvite && (
          <div className="calendar-card">
            <CalendarDays size={28} className="cal-icon" />
            <div className="cal-text">
              <strong>{m.subject}</strong>
              <span>{rsvp ? `You responded: ${rsvp}` : 'Calendar invitation · respond to add it to your calendar'}</span>
            </div>
            <div className="rsvp">
              {['Yes', 'Maybe', 'No'].map((r) => (
                <button key={r} className={`chip ${rsvp === r ? 'active' : ''}`} onClick={() => { setRsvp(r); push(`Responded "${r}" to the invitation`) }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {m.attachments.length > 0 && (
          <div className="attachments">
            {m.attachments.map((a) => (
              <button
                key={a.id}
                className="attachment"
                title={a.url ? `Download ${a.name}` : 'Demo attachment'}
                onClick={() => {
                  if (!a.url) {
                    push(`"${a.name}" is a demo attachment and has no file contents to download`)
                    return
                  }
                  const link = document.createElement('a')
                  link.href = a.url
                  link.download = a.name
                  link.click()
                  push(`Downloading ${a.name}`)
                }}
              >
                <span className="att-icon">
                  <FileText size={18} />
                </span>
                <span>{a.name}</span>
                <span className="att-size">{formatBytes(a.size)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="message-text">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {!isScheduled && !inTrash && (
          <div className="reply-bar">
            <button className="btn-outline small" onClick={() => reply(false)}>
              <Reply size={16} /> Reply
            </button>
            <button className="btn-outline small" onClick={forward}>
              <Forward size={16} /> Forward
            </button>
          </div>
        )}
      </article>
    </>
  )
}
