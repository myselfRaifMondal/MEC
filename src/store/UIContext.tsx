import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ComposeDraft } from '../types'

export type ModalName = 'settings' | 'setup' | 'shortcuts' | 'refer' | 'upgrade' | 'feedback' | null
export type SearchScope = 'folder' | 'all'

export interface SearchOptions {
  scope: SearchScope
  hasAttachment: boolean
  unreadOnly: boolean
}

interface UIValue {
  search: string
  setSearch: (s: string) => void
  searchOptions: SearchOptions
  setSearchOptions: (o: Partial<SearchOptions>) => void
  compose: ComposeDraft | null
  openCompose: (draft?: Partial<ComposeDraft>) => void
  closeCompose: () => void
  modal: ModalName
  openModal: (m: ModalName) => void
  closeModal: () => void
  aiOpen: boolean
  setAiOpen: (open: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const UIContext = createContext<UIValue | null>(null)

const EMPTY_DRAFT: ComposeDraft = { to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] }

export function UIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [searchOptions, setOpts] = useState<SearchOptions>({ scope: 'folder', hasAttachment: false, unreadOnly: false })
  const [compose, setCompose] = useState<ComposeDraft | null>(null)
  const [modal, setModal] = useState<ModalName>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openCompose = useCallback((draft?: Partial<ComposeDraft>) => setCompose({ ...EMPTY_DRAFT, ...draft }), [])
  const closeCompose = useCallback(() => setCompose(null), [])
  const setSearchOptions = useCallback((o: Partial<SearchOptions>) => setOpts((prev) => ({ ...prev, ...o })), [])

  const value = useMemo<UIValue>(
    () => ({
      search,
      setSearch,
      searchOptions,
      setSearchOptions,
      compose,
      openCompose,
      closeCompose,
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
      aiOpen,
      setAiOpen,
      sidebarOpen,
      setSidebarOpen,
    }),
    [search, searchOptions, setSearchOptions, compose, openCompose, closeCompose, modal, aiOpen, sidebarOpen],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside UIProvider')
  return ctx
}
