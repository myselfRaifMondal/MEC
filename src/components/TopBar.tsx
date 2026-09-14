import { Eye, EyeOff, Gift, Menu as MenuIcon, Search, Settings, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useStore } from '../store/StoreContext'
import { useUI } from '../store/UIContext'
import { Avatar } from './Avatar'
import { Menu, MenuItem } from './Menu'

export function TopBar() {
  const { state, dispatch } = useStore()
  const { search, setSearch, searchOptions, setSearchOptions, openModal, aiOpen, setAiOpen, setSidebarOpen } = useUI()
  const inputRef = useRef<HTMLInputElement>(null)
  const paneOn = state.settings.readingPane === 'right'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <button className="icon-btn plain menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
          <MenuIcon size={22} />
        </button>
        <div className="search">
          <span className="search-icon">
            <Search size={22} />
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search mail"
            aria-label="Search mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                inputRef.current?.blur()
              }
            }}
          />
          {search && (
            <button className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={16} />
            </button>
          )}
          <Menu
            align="right"
            trigger={(open, toggle) => (
              <button className={`search-filter ${open ? 'active' : ''}`} aria-label="Search options" onClick={toggle}>
                <SlidersHorizontal size={20} />
              </button>
            )}
          >
            {() => (
              <>
                <div className="menu-label">Search in</div>
                <MenuItem
                  label={`${searchOptions.scope === 'folder' ? '● ' : '○ '}Current folder`}
                  onClick={() => setSearchOptions({ scope: 'folder' })}
                />
                <MenuItem label={`${searchOptions.scope === 'all' ? '● ' : '○ '}All folders`} onClick={() => setSearchOptions({ scope: 'all' })} />
                <div className="menu-sep" />
                <div className="menu-label">Only show</div>
                <MenuItem
                  label={`${searchOptions.hasAttachment ? '☑ ' : '☐ '}With attachments`}
                  onClick={() => setSearchOptions({ hasAttachment: !searchOptions.hasAttachment })}
                />
                <MenuItem
                  label={`${searchOptions.unreadOnly ? '☑ ' : '☐ '}Unread messages`}
                  onClick={() => setSearchOptions({ unreadOnly: !searchOptions.unreadOnly })}
                />
              </>
            )}
          </Menu>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="pill pill-solid" onClick={() => openModal('refer')}>
          <Gift size={18} />
          <span>Refer a friend</span>
        </button>
        <button className={`pill pill-outline ${aiOpen ? 'active' : ''}`} onClick={() => setAiOpen(!aiOpen)} aria-pressed={aiOpen}>
          <Sparkles size={18} />
          <span>Ask AI</span>
        </button>
        <button
          className={`icon-btn ${paneOn ? '' : 'active'}`}
          aria-label={paneOn ? 'Hide reading pane' : 'Show reading pane'}
          title={paneOn ? 'Hide reading pane' : 'Show reading pane'}
          onClick={() => dispatch({ type: 'updateSettings', settings: { readingPane: paneOn ? 'off' : 'right' } })}
        >
          {paneOn ? <Eye size={22} /> : <EyeOff size={22} />}
        </button>
        <button className="icon-btn" aria-label="Settings" title="Settings" onClick={() => openModal('settings')}>
          <Settings size={22} />
        </button>
        <Menu
          align="right"
          trigger={(_open, toggle) => (
            <button onClick={toggle} aria-label="Account menu" style={{ display: 'block' }}>
              <Avatar name={state.settings.displayName} me />
            </button>
          )}
        >
          {(close) => (
            <>
              <div style={{ padding: '10px 12px 6px' }}>
                <div style={{ fontWeight: 700 }}>{state.settings.displayName}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{state.settings.email}</div>
              </div>
              <div className="menu-sep" />
              <MenuItem
                label="Account settings"
                onClick={() => {
                  close()
                  openModal('settings')
                }}
              />
              <MenuItem
                label="Keyboard shortcuts"
                onClick={() => {
                  close()
                  openModal('shortcuts')
                }}
              />
              <MenuItem
                label="Log out"
                onClick={() => {
                  close()
                  window.alert('This is a demo client. There is no session to log out of.')
                }}
              />
            </>
          )}
        </Menu>
      </div>
    </header>
  )
}
