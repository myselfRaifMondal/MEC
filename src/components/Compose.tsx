import { ChevronDown, Clock, Maximize2, Minimize2, Minus, Paperclip, Send, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ME } from '../data/seed'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import type { Address, Attachment, ComposeDraft } from '../types'
import { parseAddressList, uid } from '../utils/format'
import { Menu, MenuItem } from './Menu'
import { Avatar } from './Avatar'

const AUTOSAVE_MS = 1500

function scheduleOptions(): { label: string; at: Date }[] {
  const now = new Date()
  const tomorrowMorning = new Date(now)
  tomorrowMorning.setDate(now.getDate() + 1)
  tomorrowMorning.setHours(8, 0, 0, 0)
  const tomorrowAfternoon = new Date(tomorrowMorning)
  tomorrowAfternoon.setHours(13, 0, 0, 0)
  const monday = new Date(now)
  monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7))
  monday.setHours(8, 0, 0, 0)
  const inAnHour = new Date(now.getTime() + 60 * 60 * 1000)
  const fmt = (d: Date) => d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return [
    { label: `In 1 hour (${fmt(inAnHour)})`, at: inAnHour },
    { label: `Tomorrow morning (${fmt(tomorrowMorning)})`, at: tomorrowMorning },
    { label: `Tomorrow afternoon (${fmt(tomorrowAfternoon)})`, at: tomorrowAfternoon },
    { label: `Monday morning (${fmt(monday)})`, at: monday },
  ]
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function Compose() {
  const { compose, closeCompose } = useUI()
  if (!compose) return null
  return <ComposeWindow key={compose.id ?? 'new'} initial={compose} onClose={closeCompose} />
}

function ComposeWindow({ initial, onClose }: { initial: ComposeDraft; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const { push } = useToast()
  const [draft, setDraft] = useState<ComposeDraft>(initial)
  const [draftId, setDraftId] = useState<string | undefined>(initial.id)
  const [showCc, setShowCc] = useState(Boolean(initial.cc))
  const [showBcc, setShowBcc] = useState(Boolean(initial.bcc))
  const [minimized, setMinimized] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<string>(initial.id ? 'Draft loaded' : '')
  const [errors, setErrors] = useState<string | null>(null)
  const [customTime, setCustomTime] = useState<string | null>(null)
  const dirty = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const draftIdRef = useRef(draftId)
  draftIdRef.current = draftId

  const update = (patch: Partial<ComposeDraft>) => {
    dirty.current = true
    setErrors(null)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const buildAddresses = (): { to: Address[]; cc: Address[]; bcc: Address[]; invalid: string[] } => {
    const to = parseAddressList(draft.to)
    const cc = parseAddressList(draft.cc)
    const bcc = parseAddressList(draft.bcc)
    return { to: to.valid, cc: cc.valid, bcc: bcc.valid, invalid: [...to.invalid, ...cc.invalid, ...bcc.invalid] }
  }

  const isEmpty = !draft.to && !draft.cc && !draft.bcc && !draft.subject && !draft.body.trim() && draft.attachments.length === 0

  const persistDraft = (): string | undefined => {
    if (isEmpty) return draftIdRef.current
    const a = buildAddresses()
    dispatch({
      type: 'saveDraft',
      draftId: draftIdRef.current,
      message: {
        from: { name: state.settings.displayName, email: state.settings.email },
        to: a.to,
        cc: a.cc,
        bcc: a.bcc,
        subject: draft.subject,
        body: draft.body,
        attachments: draft.attachments,
        hasCalendarInvite: false,
        inReplyTo: draft.inReplyTo,
      },
    })
    return draftIdRef.current
  }

  // Autosave: the reducer assigns an id on first save; find it back to keep updating the same draft.
  useEffect(() => {
    if (!dirty.current) return
    const t = window.setTimeout(() => {
      if (isEmpty) return
      persistDraft()
      setStatus(`Draft saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)
      dirty.current = false
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // Once a draft exists in the store, remember its id so later saves update it instead of duplicating.
  useEffect(() => {
    if (draftId) return
    const mine = state.messages.find(
      (m) => m.folder === 'drafts' && m.subject === draft.subject && m.body === draft.body && !initial.id,
    )
    if (mine) setDraftId(mine.id)
  }, [state.messages, draftId, draft.subject, draft.body, initial.id])

  const validate = (): ReturnType<typeof buildAddresses> | null => {
    const a = buildAddresses()
    if (a.invalid.length) {
      setErrors(`Invalid address${a.invalid.length > 1 ? 'es' : ''}: ${a.invalid.join(', ')}`)
      return null
    }
    if (a.to.length + a.cc.length + a.bcc.length === 0) {
      setErrors('Add at least one recipient.')
      return null
    }
    return a
  }

  const send = () => {
    const a = validate()
    if (!a) return
    if (!draft.subject.trim() && !window.confirm('Send this message without a subject?')) return
    const message = {
      from: { name: state.settings.displayName, email: state.settings.email },
      to: a.to,
      cc: a.cc,
      bcc: a.bcc,
      subject: draft.subject,
      body: draft.body,
      attachments: draft.attachments,
      hasCalendarInvite: false,
      inReplyTo: draft.inReplyTo,
    }
    dispatch({ type: 'sendMessage', message, draftId })
    // Simulate a bounce for unreachable addresses so the demo Postmaster stays believable.
    const bounced = a.to.find((t) => /noreply|no-reply|donotreply/i.test(t.email))
    if (bounced) {
      window.setTimeout(() => {
        dispatch({
          type: 'receiveMessage',
          message: {
            id: uid('bounce'),
            folder: 'inbox',
            from: { name: 'Postmaster', email: `postmaster@${ME.email.split('@')[1]}` },
            to: [ME],
            cc: [],
            bcc: [],
            subject: `Delivery Status Notification (Failure): ${draft.subject || '(no subject)'}`,
            body: `Delivery to the following recipient failed permanently:\n\n  ${bounced.email}\n\nTechnical details: 550 5.1.1 The mailbox does not accept mail.`,
            date: new Date().toISOString(),
            read: false,
            starred: false,
            attachments: [],
            hasCalendarInvite: false,
          },
        })
      }, 2500)
    }
    push('Message sent')
    onClose()
  }

  const schedule = (at: Date) => {
    const a = validate()
    if (!a) return
    if (at.getTime() <= Date.now()) {
      setErrors('Pick a time in the future.')
      return
    }
    dispatch({
      type: 'scheduleMessage',
      draftId,
      sendAt: at.toISOString(),
      message: {
        from: { name: state.settings.displayName, email: state.settings.email },
        to: a.to,
        cc: a.cc,
        bcc: a.bcc,
        subject: draft.subject,
        body: draft.body,
        attachments: draft.attachments,
        hasCalendarInvite: false,
        inReplyTo: draft.inReplyTo,
      },
    })
    push(`Scheduled for ${at.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`)
    onClose()
  }

  const discard = () => {
    if (!isEmpty && !window.confirm('Discard this message?')) return
    if (draftId) dispatch({ type: 'discardDraft', id: draftId })
    push('Draft discarded')
    onClose()
  }

  const closeAndSave = () => {
    if (!isEmpty && (dirty.current || !draftId)) {
      persistDraft()
      push('Draft saved')
    }
    onClose()
  }

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const total = [...draft.attachments, ...files].reduce((n, f) => n + f.size, 0)
    if (total > 25 * 1024 * 1024) {
      setErrors('Attachments are limited to 25 MB per message.')
      return
    }
    const added: Attachment[] = files.map((f) => ({ id: uid('att'), name: f.name, size: f.size, type: f.type || 'application/octet-stream' }))
    update({ attachments: [...draft.attachments, ...added] })
    e.target.value = ''
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        send()
      }
      if (e.key === 'Escape' && !minimized) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') target.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = draft.subject || (draft.inReplyTo ? 'Reply' : 'New message')
  const classes = ['compose', minimized ? 'minimized' : '', expanded && !minimized ? 'expanded' : ''].filter(Boolean).join(' ')

  return (
    <div className={classes} role="dialog" aria-label="Compose message">
      <div className="compose-header" onDoubleClick={() => setMinimized((m) => !m)}>
        <span className="title">{title}</span>
        <div className="actions">
          <button className="icon-btn plain" aria-label={minimized ? 'Restore' : 'Minimize'} onClick={() => setMinimized((m) => !m)}>
            <Minus size={18} />
          </button>
          <button className="icon-btn plain" aria-label={expanded ? 'Shrink' : 'Expand'} onClick={() => { setExpanded((x) => !x); setMinimized(false) }}>
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button className="icon-btn plain" aria-label="Save and close" onClick={closeAndSave}>
            <X size={20} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="compose-fields">
            <div className="compose-field">
              <label>From</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px 0', fontSize: 14 }}>
                <Avatar name={state.settings.displayName} size="sm" me />
                <span>
                  {state.settings.displayName} <span style={{ color: 'var(--muted)' }}>&lt;{state.settings.email}&gt;</span>
                </span>
              </div>
            </div>
            <RecipientField label="To" value={draft.to} onChange={(v) => update({ to: v })} autoFocus={!initial.to}>
              <div className="cc-links">
                {!showCc && <button onClick={() => setShowCc(true)}>Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)}>Bcc</button>}
              </div>
            </RecipientField>
            {showCc && <RecipientField label="Cc" value={draft.cc} onChange={(v) => update({ cc: v })} />}
            {showBcc && <RecipientField label="Bcc" value={draft.bcc} onChange={(v) => update({ bcc: v })} />}
            <div className="compose-field">
              <label htmlFor="compose-subject">Subject</label>
              <input id="compose-subject" value={draft.subject} onChange={(e) => update({ subject: e.target.value })} placeholder="Subject" />
            </div>
          </div>

          <div className="compose-body">
            <textarea
              aria-label="Message body"
              value={draft.body}
              onChange={(e) => update({ body: e.target.value })}
              placeholder="Write your message…"
              autoFocus={Boolean(initial.to)}
            />
            {draft.attachments.length > 0 && (
              <div className="compose-attachments">
                <div className="attachments" style={{ margin: '4px 0 12px' }}>
                  {draft.attachments.map((a) => (
                    <div className="attachment" key={a.id}>
                      <span className="att-icon">
                        <Paperclip size={16} />
                      </span>
                      <span>{a.name}</span>
                      <span className="att-size">{(a.size / 1024).toFixed(0)} KB</span>
                      <button className="att-remove" aria-label={`Remove ${a.name}`} onClick={() => update({ attachments: draft.attachments.filter((x) => x.id !== a.id) })}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {errors && (
            <div className="error-text" style={{ padding: '6px 18px' }}>
              {errors}
            </div>
          )}

          <div className="compose-footer">
            <div className="split">
              <button className="btn-primary small" onClick={send} title="Send (Ctrl+Enter)">
                <Send size={16} /> Send
              </button>
              <Menu
                trigger={(_open, toggle) => (
                  <button className="split-arrow" aria-label="Send options" onClick={toggle}>
                    <ChevronDown size={16} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <div className="menu-label">Schedule send</div>
                    {scheduleOptions().map((o) => (
                      <MenuItem key={o.label} icon={<Clock size={16} />} label={o.label} onClick={() => { close(); schedule(o.at) }} />
                    ))}
                    <div className="menu-sep" />
                    <MenuItem
                      label="Pick date and time…"
                      onClick={() => {
                        close()
                        setCustomTime(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)))
                      }}
                    />
                  </>
                )}
              </Menu>
            </div>
            <button className="icon-btn plain" aria-label="Attach files" title="Attach files" onClick={() => fileInput.current?.click()}>
              <Paperclip size={20} />
            </button>
            <input ref={fileInput} type="file" multiple hidden onChange={addFiles} />
            {customTime !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input className="input" type="datetime-local" value={customTime} min={toLocalInputValue(new Date())} onChange={(e) => setCustomTime(e.target.value)} style={{ padding: '6px 8px', fontSize: 13 }} />
                <button className="btn-outline small" onClick={() => schedule(new Date(customTime))}>
                  Schedule
                </button>
                <button className="icon-btn plain" aria-label="Cancel scheduling" onClick={() => setCustomTime(null)}>
                  <X size={16} />
                </button>
              </div>
            )}
            <span className="spacer" />
            <span className="status">{status}</span>
            <button className="icon-btn plain" aria-label="Discard draft" title="Discard" onClick={discard}>
              <Trash2 size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  children?: React.ReactNode
}) {
  const { state } = useStore()
  const [focused, setFocused] = useState(false)
  const [hl, setHl] = useState(0)
  const id = `compose-${label.toLowerCase()}`

  const term = value.split(/[,;]/).pop()?.trim().toLowerCase() ?? ''
  const suggestions = useMemo(() => {
    if (!term || term.length < 1) return []
    const seen = new Set<string>()
    const pool: Address[] = [
      ...state.contacts.map((c) => ({ name: c.name, email: c.email })),
      ...state.messages.map((m) => m.from),
      ...state.messages.flatMap((m) => m.to),
    ]
    const out: Address[] = []
    for (const a of pool) {
      const key = a.email.toLowerCase()
      if (seen.has(key) || key === ME.email) continue
      if (key.includes(term) || a.name.toLowerCase().includes(term)) {
        seen.add(key)
        out.push(a)
      }
      if (out.length >= 6) break
    }
    return out
  }, [term, state.contacts, state.messages])

  const pick = (a: Address) => {
    const parts = value.split(/[,;]/)
    parts.pop()
    const head = parts.map((p) => p.trim()).filter(Boolean)
    const next = [...head, a.name ? `${a.name} <${a.email}>` : a.email].join(', ') + ', '
    onChange(next)
    setHl(0)
  }

  return (
    <div className="compose-field rel">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Recipients"
        onChange={(e) => {
          onChange(e.target.value)
          setHl(0)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (!suggestions.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHl((h) => (h + 1) % suggestions.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHl((h) => (h - 1 + suggestions.length) % suggestions.length)
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            pick(suggestions[hl])
          }
        }}
      />
      {children}
      {focused && suggestions.length > 0 && (
        <div className="suggestions" role="listbox">
          {suggestions.map((a, i) => (
            <button key={a.email} className={`suggestion ${i === hl ? 'hl' : ''}`} role="option" aria-selected={i === hl} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(a)}>
              <Avatar name={a.name || a.email} email={a.email} size="sm" />
              <span>
                <div>{a.name || a.email}</div>
                {a.name && <div className="s-email">{a.email}</div>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
