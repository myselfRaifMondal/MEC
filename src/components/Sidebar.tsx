import {
  AlertCircle,
  Clock,
  FileText,
  Folder,
  FolderPlus,
  Inbox,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  SquarePen,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import { unreadCount } from '../store/queries'
import { formatBytes } from '../utils/format'
import { folderToPath } from '../utils/routes'
import { Menu, MenuItem } from './Menu'

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <path d="M6 4h6v9h8V4h6v24h-6v-9h-8v9H6z" fill="#fff" />
        </svg>
      </span>
      <span>HOSTINGER</span>
      <span className="brand-sep">|</span>
      <span className="brand-product">Mail</span>
    </div>
  )
}

export function Sidebar() {
  const { state, dispatch } = useStore()
  const { openCompose, openModal, sidebarOpen, setSidebarOpen } = useUI()
  const { push } = useToast()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const inboxUnread = unreadCount(state.messages, 'inbox')
  const spamUnread = unreadCount(state.messages, 'spam')
  const draftCount = state.messages.filter((m) => m.folder === 'drafts').length
  const scheduledCount = state.messages.filter((m) => m.folder === 'scheduled').length
  const setupDone = state.setupSteps.filter((s) => s.done).length
  const storagePct = Math.min(100, (state.storageUsedBytes / state.storageQuotaBytes) * 100)

  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      push('Inbox is up to date')
    }, 700)
  }

  const submitFolder = (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (state.customFolders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      push('A folder with that name already exists')
      return
    }
    dispatch({ type: 'addFolder', name })
    dispatch({ type: 'completeSetupStep', id: 'folders' })
    setNewName('')
    setAdding(false)
    push(`Folder "${name}" created`)
  }

  const submitRename = (e: FormEvent, id: string) => {
    e.preventDefault()
    if (renameValue.trim()) dispatch({ type: 'renameFolder', id, name: renameValue })
    setRenaming(null)
  }

  const removeFolder = (id: string, name: string) => {
    const count = state.messages.filter((m) => m.folder === `custom:${id}`).length
    if (count > 0 && !window.confirm(`Delete "${name}"? Its ${count} message${count === 1 ? '' : 's'} will move back to Inbox.`)) return
    dispatch({ type: 'deleteFolder', id })
    navigate('/inbox')
    push(`Folder "${name}" deleted`)
  }

  const close = () => setSidebarOpen(false)

  return (
    <>
      {sidebarOpen && <div className="sidebar-scrim" onClick={close} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Logo />
        <button
          className="btn-primary btn-new-message"
          onClick={() => {
            openCompose()
            close()
          }}
        >
          <SquarePen size={20} />
          New message
        </button>

        <nav className="nav" aria-label="Folders">
          <NavLink to="/inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <Inbox size={22} />
            </span>
            <span className="nav-label">Inbox</span>
            {inboxUnread > 0 && <span className="badge">{inboxUnread}</span>}
            <span
              role="button"
              tabIndex={0}
              className={`nav-action ${refreshing ? 'spinning' : ''}`}
              aria-label="Refresh inbox"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                refresh()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  refresh()
                }
              }}
            >
              <RefreshCw size={18} />
            </span>
          </NavLink>
          <NavLink to="/drafts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <FileText size={22} />
            </span>
            <span className="nav-label">Drafts</span>
            {draftCount > 0 && <span className="badge">{draftCount}</span>}
          </NavLink>
          <NavLink to="/scheduled" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <Clock size={22} />
            </span>
            <span className="nav-label">Scheduled</span>
            {scheduledCount > 0 && <span className="badge">{scheduledCount}</span>}
          </NavLink>
          <NavLink to="/sent" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <Send size={22} />
            </span>
            <span className="nav-label">Sent</span>
          </NavLink>
          <NavLink to="/spam" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <AlertCircle size={22} />
            </span>
            <span className="nav-label">Spam</span>
            {spamUnread > 0 && <span className="badge">{spamUnread}</span>}
          </NavLink>
          <NavLink to="/trash" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <Trash2 size={22} />
            </span>
            <span className="nav-label">Trash</span>
          </NavLink>

          <div className="nav-item" style={{ cursor: 'default' }}>
            <span className="nav-icon">
              <Folder size={22} />
            </span>
            <span className="nav-label">Folders</span>
            <button className="nav-action" aria-label="Create folder" onClick={() => setAdding((a) => !a)}>
              {adding ? <X size={20} /> : <Plus size={22} />}
            </button>
          </div>

          {adding && (
            <form className="nav-inline-form" onSubmit={submitFolder}>
              <input
                className="input"
                autoFocus
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
                maxLength={40}
              />
              <button className="btn-primary small" type="submit" disabled={!newName.trim()}>
                <FolderPlus size={16} />
              </button>
            </form>
          )}

          <div className="nav-sub">
            {state.customFolders.map((f) =>
              renaming === f.id ? (
                <form key={f.id} className="nav-inline-form" style={{ paddingLeft: 40 }} onSubmit={(e) => submitRename(e, f.id)}>
                  <input
                    className="input"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                    onBlur={() => setRenaming(null)}
                    maxLength={40}
                  />
                </form>
              ) : (
                <NavLink
                  key={f.id}
                  to={folderToPath(`custom:${f.id}`)}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={close}
                >
                  <span className="nav-icon">
                    <Folder size={18} />
                  </span>
                  <span className="nav-label">{f.name}</span>
                  {unreadCount(state.messages, `custom:${f.id}`) > 0 && (
                    <span className="badge">{unreadCount(state.messages, `custom:${f.id}`)}</span>
                  )}
                  <Menu
                    align="right"
                    trigger={(_open, toggle) => (
                      <span
                        role="button"
                        tabIndex={0}
                        className="nav-action"
                        aria-label={`Options for ${f.name}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggle()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            toggle()
                          }
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </span>
                    )}
                  >
                    {(closeMenu) => (
                      <>
                        <MenuItem
                          icon={<Pencil size={16} />}
                          label="Rename"
                          onClick={() => {
                            closeMenu()
                            setRenameValue(f.name)
                            setRenaming(f.id)
                          }}
                        />
                        <MenuItem
                          icon={<Trash2 size={16} />}
                          label="Delete folder"
                          danger
                          onClick={() => {
                            closeMenu()
                            removeFolder(f.id, f.name)
                          }}
                        />
                      </>
                    )}
                  </Menu>
                </NavLink>
              ),
            )}
          </div>

          <NavLink to="/contacts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <span className="nav-icon">
              <Users size={22} />
            </span>
            <span className="nav-label">Contacts</span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />

        <div className="storage">
          <div className="storage-bar" role="progressbar" aria-valuenow={Math.round(storagePct)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(2, storagePct)}%` }} />
          </div>
          <div className="storage-meta">
            <div>
              <strong>{formatBytes(state.storageUsedBytes)}</strong>
              <span className="muted">/ {formatBytes(state.storageQuotaBytes)}</span>
            </div>
            <button className="link-btn" onClick={() => openModal('upgrade')}>
              Upgrade
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn-outline full" onClick={() => openModal('feedback')}>
            <MessageSquare size={18} />
            Send Feedback
          </button>
          <button className="btn-outline full" onClick={() => openModal('setup')}>
            <Rocket size={18} />
            Setup guide {setupDone}/{state.setupSteps.length}
          </button>
        </div>
      </aside>
    </>
  )
}
