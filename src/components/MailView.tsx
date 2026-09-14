import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, FolderInput, Inbox, Mail, MailOpen, ShieldAlert, ShieldCheck, Star, Trash2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import { addressesToString } from '../store/reducer'
import { folderLabel, listMessages, paginate } from '../store/queries'
import type { FolderId, Message, MessageFilter, SortOrder } from '../types'
import { folderToPath, messagePath, segmentToFolder } from '../utils/routes'
import { Checkbox } from './Checkbox'
import { Menu, MenuItem } from './Menu'
import { MessagePreview } from './MessagePreview'
import { MessageRow } from './MessageRow'

const FILTERS: { id: MessageFilter; label: string }[] = [
  { id: 'all', label: 'All mail' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
  { id: 'starred', label: 'Starred' },
]

export function MailView() {
  const params = useParams<{ folder: string; messageId?: string }>()
  const folder = segmentToFolder(params.folder)
  if (!folder) return <Navigate to="/inbox" replace />
  return <FolderView key={folder} folder={folder} messageId={params.messageId} />
}

function FolderView({ folder, messageId }: { folder: FolderId; messageId?: string }) {
  const { state, dispatch } = useStore()
  const { search, searchOptions, openCompose, openModal, closeCompose } = useUI()
  const { push } = useToast()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<MessageFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())

  const searching = search.trim().length > 0
  const scopeAll = searching && searchOptions.scope === 'all'

  const all = useMemo(() => {
    const base = listMessages(state, { folder: scopeAll ? null : folder, filter, sort, search })
    if (!searching) return base
    return base.filter((m) => (!searchOptions.hasAttachment || m.attachments.length > 0) && (!searchOptions.unreadOnly || !m.read))
  }, [state, folder, filter, sort, search, searching, scopeAll, searchOptions])

  useEffect(() => {
    setPage(1)
    setChecked(new Set())
  }, [filter, search, folder, searchOptions])

  const { items, page: safePage, pages } = paginate(all, page, state.settings.pageSize)
  const selected = messageId ? state.messages.find((m) => m.id === messageId) : undefined

  // A stale URL (message moved/deleted) falls back to the folder view.
  useEffect(() => {
    if (messageId && !selected) navigate(folderToPath(folder), { replace: true })
  }, [messageId, selected, folder, navigate])

  useEffect(() => {
    if (selected && !selected.read && state.settings.markReadOnOpen) {
      dispatch({ type: 'markRead', ids: [selected.id], read: true })
    }
  }, [selected, state.settings.markReadOnOpen, dispatch])

  const openMessage = useCallback(
    (m: Message) => {
      if (m.folder === 'drafts') {
        openCompose({
          id: m.id,
          to: addressesToString(m.to),
          cc: addressesToString(m.cc),
          bcc: addressesToString(m.bcc),
          subject: m.subject,
          body: m.body,
          attachments: m.attachments,
          inReplyTo: m.inReplyTo,
        })
        return
      }
      navigate(messagePath(folder, m.id))
    },
    [folder, navigate, openCompose],
  )

  const pageIds = items.map((m) => m.id)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.has(id))
  const someChecked = pageIds.some((id) => checked.has(id))
  const checkedIds = [...checked]

  const toggleAll = (next: boolean) => {
    setChecked(next ? new Set(pageIds) : new Set())
  }
  const toggleOne = (id: string, next: boolean) => {
    setChecked((prev) => {
      const s = new Set(prev)
      if (next) s.add(id)
      else s.delete(id)
      return s
    })
  }

  const afterBulk = (ids: string[]) => {
    setChecked(new Set())
    if (messageId && ids.includes(messageId)) navigate(folderToPath(folder))
  }

  const bulkTrash = (ids: string[]) => {
    const permanent = folder === 'trash'
    if (permanent && !window.confirm(`Permanently delete ${ids.length} message${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return
    const snapshot = state.messages.filter((m) => ids.includes(m.id))
    dispatch({ type: 'trash', ids })
    afterBulk(ids)
    if (permanent) {
      push(`${ids.length} message${ids.length === 1 ? '' : 's'} deleted permanently`)
    } else {
      push(`${ids.length} message${ids.length === 1 ? '' : 's'} moved to Trash`, {
        label: 'Undo',
        onAction: () => {
          for (const m of snapshot) dispatch({ type: 'moveTo', ids: [m.id], folder: m.folder })
        },
      })
    }
  }

  const bulkMove = (ids: string[], target: FolderId) => {
    const snapshot = state.messages.filter((m) => ids.includes(m.id))
    dispatch({ type: 'moveTo', ids, folder: target })
    afterBulk(ids)
    push(`Moved to ${folderLabel(target, state.customFolders)}`, {
      label: 'Undo',
      onAction: () => {
        for (const m of snapshot) dispatch({ type: 'moveTo', ids: [m.id], folder: m.folder })
      },
    })
  }

  const bulkRestore = (ids: string[]) => {
    dispatch({ type: 'restore', ids })
    afterBulk(ids)
    push('Restored')
  }

  // Keyboard shortcuts scoped to this view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = selected ? items.findIndex((m) => m.id === selected.id) : -1
      switch (e.key) {
        case 'c':
          e.preventDefault()
          openCompose()
          break
        case 'j':
        case 'ArrowDown': {
          if (items.length === 0) return
          e.preventDefault()
          const next = items[Math.min(items.length - 1, idx + 1)]
          if (next) openMessage(next)
          break
        }
        case 'k':
        case 'ArrowUp': {
          if (items.length === 0) return
          e.preventDefault()
          const prev = items[Math.max(0, idx - 1)]
          if (prev) openMessage(prev)
          break
        }
        case 's':
          if (selected) dispatch({ type: 'toggleStar', id: selected.id })
          break
        case 'u':
          if (selected) dispatch({ type: 'markRead', ids: [selected.id], read: !selected.read })
          break
        case 'Delete':
        case 'Backspace':
        case '#':
          if (checked.size > 0) bulkTrash(checkedIds)
          else if (selected) bulkTrash([selected.id])
          break
        case 'Escape':
          if (checked.size > 0) setChecked(new Set())
          else if (selected) navigate(folderToPath(folder))
          break
        case '?':
          openModal('shortcuts')
          break
        default:
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const paneOff = state.settings.readingPane === 'off'
  const contentClass = ['content', paneOff && !selected ? 'pane-off' : '', paneOff && selected ? 'pane-only' : '', selected ? 'has-message' : '']
    .filter(Boolean)
    .join(' ')

  const title = scopeAll ? 'Search results' : folderLabel(folder, state.customFolders)
  const inTrash = folder === 'trash'
  const inSpam = folder === 'spam'

  return (
    <div className={contentClass}>
      <section className="list" aria-label={`${title} message list`}>
        <div className="list-header">
          <h1 className="list-title">
            {title}
            {searching && <small>{all.length} result{all.length === 1 ? '' : 's'}</small>}
          </h1>
          <div className="list-pager">
            <button
              className="icon-btn plain"
              aria-label={sort === 'newest' ? 'Sort oldest first' : 'Sort newest first'}
              title={sort === 'newest' ? 'Newest first' : 'Oldest first'}
              onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            >
              <ArrowUpDown size={20} />
            </button>
            <button className="icon-btn plain" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft size={22} />
            </button>
            <span className="page-label">
              {safePage}/{pages}
            </span>
            <button className="icon-btn plain" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        <div className="list-toolbar">
          <div className="select-all">
            <Checkbox checked={allChecked} mixed={someChecked && !allChecked} onChange={toggleAll} label="Select all on this page" />
            <Menu
              trigger={(_open, toggle) => (
                <button className="icon-btn plain" aria-label="Selection options" onClick={toggle} style={{ width: 30 }}>
                  <ChevronDown size={18} />
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem label="All on this page" onClick={() => { toggleAll(true); close() }} />
                  <MenuItem label="None" onClick={() => { toggleAll(false); close() }} />
                  <MenuItem label="Unread" onClick={() => { setChecked(new Set(items.filter((m) => !m.read).map((m) => m.id))); close() }} />
                  <MenuItem label="Read" onClick={() => { setChecked(new Set(items.filter((m) => m.read).map((m) => m.id))); close() }} />
                  <MenuItem label="Starred" onClick={() => { setChecked(new Set(items.filter((m) => m.starred).map((m) => m.id))); close() }} />
                </>
              )}
            </Menu>
          </div>

          {checked.size === 0 ? (
            <div className="chips" role="tablist" aria-label="Filter messages">
              {FILTERS.map((f) => (
                <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="bulk-actions">
              <span className="count">{checked.size} selected</span>
              <button className="icon-btn plain" title="Mark as read" aria-label="Mark as read" onClick={() => { dispatch({ type: 'markRead', ids: checkedIds, read: true }); setChecked(new Set()) }}>
                <MailOpen size={20} />
              </button>
              <button className="icon-btn plain" title="Mark as unread" aria-label="Mark as unread" onClick={() => { dispatch({ type: 'markRead', ids: checkedIds, read: false }); setChecked(new Set()) }}>
                <Mail size={20} />
              </button>
              <button className="icon-btn plain" title="Star" aria-label="Star" onClick={() => { dispatch({ type: 'setStar', ids: checkedIds, starred: true }); setChecked(new Set()) }}>
                <Star size={20} />
              </button>
              <Menu
                trigger={(_open, toggle) => (
                  <button className="icon-btn plain" title="Move to" aria-label="Move to folder" onClick={toggle}>
                    <FolderInput size={20} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    {folder !== 'inbox' && <MenuItem icon={<Inbox size={16} />} label="Inbox" onClick={() => { close(); bulkMove(checkedIds, 'inbox') }} />}
                    {state.customFolders.map((f) => (
                      <MenuItem key={f.id} label={f.name} onClick={() => { close(); bulkMove(checkedIds, `custom:${f.id}`) }} disabled={folder === `custom:${f.id}`} />
                    ))}
                    {state.customFolders.length === 0 && folder === 'inbox' && <div className="menu-label">No folders yet</div>}
                  </>
                )}
              </Menu>
              {inSpam ? (
                <button className="icon-btn plain" title="Not spam" aria-label="Not spam" onClick={() => bulkRestore(checkedIds)}>
                  <ShieldCheck size={20} />
                </button>
              ) : (
                <button className="icon-btn plain" title="Mark as spam" aria-label="Mark as spam" onClick={() => bulkMove(checkedIds, 'spam')}>
                  <ShieldAlert size={20} />
                </button>
              )}
              {inTrash && (
                <button className="icon-btn plain" title="Restore" aria-label="Restore" onClick={() => bulkRestore(checkedIds)}>
                  <Undo2 size={20} />
                </button>
              )}
              <button className="icon-btn plain" title={inTrash ? 'Delete forever' : 'Delete'} aria-label={inTrash ? 'Delete forever' : 'Delete'} onClick={() => bulkTrash(checkedIds)}>
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="rows">
          {items.length === 0 ? (
            <EmptyList folder={folder} searching={searching} filter={filter} />
          ) : (
            items.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                selected={m.id === messageId}
                checked={checked.has(m.id)}
                showFolder={scopeAll}
                onOpen={() => openMessage(m)}
                onCheck={(next) => toggleOne(m.id, next)}
                onStar={() => dispatch({ type: 'toggleStar', id: m.id })}
              />
            ))
          )}
        </div>

        {(inTrash || inSpam) && all.length > 0 && !searching && (
          <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
            <span>{inTrash ? 'Messages in Trash are deleted after 30 days.' : 'Messages in Spam are deleted after 30 days.'}</span>
            <button
              className="link-btn"
              onClick={() => {
                if (window.confirm(`Empty ${inTrash ? 'Trash' : 'Spam'}? All messages will be permanently deleted.`)) {
                  dispatch({ type: 'emptyFolder', folder })
                  navigate(folderToPath(folder))
                  push(`${inTrash ? 'Trash' : 'Spam'} emptied`)
                }
              }}
            >
              Empty {inTrash ? 'Trash' : 'Spam'}
            </button>
          </div>
        )}
      </section>

      <section className="preview" aria-label="Message preview">
        {selected ? (
          <MessagePreview
            message={selected}
            onBack={() => navigate(folderToPath(folder))}
            onTrash={() => bulkTrash([selected.id])}
            onMove={(target) => bulkMove([selected.id], target)}
            onRestore={() => bulkRestore([selected.id])}
            onCancelScheduled={() => {
              dispatch({ type: 'moveTo', ids: [selected.id], folder: 'drafts' })
              closeCompose()
              navigate('/drafts')
              push('Scheduled send cancelled. The message is now in Drafts.')
            }}
            neighbors={{
              prev: (() => {
                const i = items.findIndex((m) => m.id === selected.id)
                return i > 0 ? items[i - 1] : undefined
              })(),
              next: (() => {
                const i = items.findIndex((m) => m.id === selected.id)
                return i >= 0 && i < items.length - 1 ? items[i + 1] : undefined
              })(),
              open: openMessage,
            }}
          />
        ) : (
          <div className="empty">
            <div className="empty-icon">
              <Mail size={28} />
            </div>
            <h3>Select message to see preview</h3>
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyList({ folder, searching, filter }: { folder: FolderId; searching: boolean; filter: MessageFilter }) {
  let title = 'Nothing here yet'
  let text = 'Messages you receive will show up in this folder.'
  if (searching) {
    title = 'No results'
    text = 'Try different keywords, or search in all folders from the search options.'
  } else if (filter !== 'all') {
    title = `No ${filter} messages`
    text = 'Switch back to "All mail" to see everything in this folder.'
  } else if (folder === 'drafts') {
    text = 'Messages you start writing but do not send are saved here automatically.'
  } else if (folder === 'scheduled') {
    text = 'Use "Schedule send" in the compose window to send a message later.'
  } else if (folder === 'sent') {
    text = 'Messages you send will appear here.'
  } else if (folder === 'trash') {
    title = 'Trash is empty'
    text = 'Deleted messages stay here for 30 days before being removed.'
  } else if (folder === 'spam') {
    title = 'No spam'
    text = 'Suspicious messages are moved here automatically.'
  }
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
