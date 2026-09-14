import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface Toast {
  id: number
  text: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastValue {
  toasts: Toast[]
  push: (text: string, action?: { label: string; onAction: () => void }) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (text: string, action?: { label: string; onAction: () => void }) => {
      const id = ++counter.current
      setToasts((t) => [...t.slice(-2), { id, text, actionLabel: action?.label, onAction: action?.onAction }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
