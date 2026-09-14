import type { Address } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function formatTime(d: Date): string {
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

/** "4:27 AM" for today, "Sep 13" for this year, "Sep 13, 2025" otherwise. */
export function formatListDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (isSameDay(d, now)) return formatTime(d)
  const md = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  if (d.getFullYear() === now.getFullYear()) return md
  return `${md}, ${d.getFullYear()}`
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${formatTime(d)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
}

export function formatAddress(a: Address): string {
  return a.name ? `${a.name} <${a.email}>` : a.email
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic hue from a string so every sender gets a stable avatar colour. */
export function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue} 45% 42%)`
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/** Parses "Name <a@b.c>, d@e.f" into address objects; invalid entries are returned separately. */
export function parseAddressList(input: string): { valid: Address[]; invalid: string[] } {
  const valid: Address[] = []
  const invalid: string[] = []
  for (const raw of input.split(/[,;\n]/)) {
    const token = raw.trim()
    if (!token) continue
    const m = token.match(/^(.*?)<([^>]+)>$/)
    if (m) {
      const email = m[2].trim()
      if (EMAIL_RE.test(email)) valid.push({ name: m[1].trim().replace(/^"|"$/g, ''), email })
      else invalid.push(token)
    } else if (EMAIL_RE.test(token)) {
      valid.push({ name: '', email: token })
    } else {
      invalid.push(token)
    }
  }
  return { valid, invalid }
}

export function snippetOf(body: string, length = 120): string {
  const text = body.replace(/\s+/g, ' ').trim()
  return text.length > length ? text.slice(0, length - 1) + '…' : text
}

export function uid(prefix = 'm'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
