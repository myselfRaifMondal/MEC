import { colorFor, initials } from '../utils/format'

interface Props {
  name: string
  email?: string
  size?: 'sm' | 'md' | 'lg'
  me?: boolean
}

export function Avatar({ name, email, size = 'md', me = false }: Props) {
  const label = name || email || '?'
  const style = me ? undefined : { background: colorFor(email ?? label) }
  return (
    <div className={`avatar ${size === 'md' ? '' : size} ${me ? 'me' : ''}`} style={style} aria-hidden="true" title={label}>
      {initials(label)}
    </div>
  )
}
