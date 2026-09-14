import { logoFor, logoNeedsLightBackdrop } from '../data/logos'
import { colorFor, initials } from '../utils/format'

interface Props {
  name: string
  email?: string
  size?: 'sm' | 'md' | 'lg'
  me?: boolean
}

/** Shows the sender's logo when one is known for their address, otherwise coloured initials. */
export function Avatar({ name, email, size = 'md', me = false }: Props) {
  const label = name || email || '?'
  const logo = me ? undefined : logoFor(email)
  const sizeClass = size === 'md' ? '' : size

  if (logo) {
    return (
      <div className={`avatar logo ${sizeClass} ${logoNeedsLightBackdrop(logo) ? 'light' : ''}`} title={label}>
        <img src={logo} alt={`${label} logo`} loading="lazy" />
      </div>
    )
  }

  const style = me ? undefined : { background: colorFor(email ?? label) }
  return (
    <div className={`avatar ${sizeClass} ${me ? 'me' : ''}`} style={style} aria-hidden="true" title={label}>
      {initials(label)}
    </div>
  )
}
