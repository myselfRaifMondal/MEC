import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  trigger: (open: boolean, toggle: () => void) => ReactNode
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}

export function Menu({ trigger, align = 'left', children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu-wrap" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className={`menu ${align}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon?: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick} role="menuitem" disabled={disabled}>
      {icon && <span className="menu-icon">{icon}</span>}
      {label}
    </button>
  )
}
