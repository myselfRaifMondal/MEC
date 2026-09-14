import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { BCREC_MESSAGE_ID, bcrecNotice, createSeedState } from '../data/seed'
import type { AppState } from '../types'
import { reducer, type Action } from './reducer'

const STORAGE_KEY = 'hostinger-mail-clone:v1'

interface StoreValue {
  state: AppState
  dispatch: (action: Action) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.messages) && parsed.settings) return migrate(parsed)
    }
  } catch {
    // ignore corrupt storage and fall back to seed data
  }
  return createSeedState()
}

/** Adds seed messages introduced after a mailbox was first saved, without touching the user's own changes. */
export function migrate(state: AppState): AppState {
  if (state.messages.some((m) => m.id === BCREC_MESSAGE_ID)) return state
  return { ...state, messages: [bcrecNotice(), ...state.messages] }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage may be unavailable (private mode, quota); the app still works in memory
    }
  }, [state])

  // Move scheduled mail into Sent once its send time passes.
  useEffect(() => {
    const tick = () => dispatch({ type: 'deliverScheduled', now: new Date().toISOString() })
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function resetDemoData(): AppState {
  const fresh = createSeedState()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return fresh
}
