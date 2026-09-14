import { Check, Minus } from 'lucide-react'

interface Props {
  checked: boolean
  mixed?: boolean
  onChange: (next: boolean) => void
  label: string
}

export function Checkbox({ checked, mixed = false, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      className={`checkbox ${checked ? 'checked' : ''} ${mixed && !checked ? 'mixed' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      {checked ? <Check size={16} strokeWidth={3} /> : mixed ? <Minus size={16} strokeWidth={3} /> : null}
    </button>
  )
}
