import { describe, expect, it } from 'vitest'
import { formatBytes, formatListDate, initials, parseAddressList, snippetOf } from '../utils/format'

describe('format helpers', () => {
  it('shows the time for today and the date otherwise', () => {
    const now = new Date(2026, 8, 14, 10, 0)
    const today = new Date(2026, 8, 14, 4, 27).toISOString()
    expect(formatListDate(today, now)).toBe('4:27 AM')
    const earlier = new Date(2026, 8, 13, 22, 5).toISOString()
    expect(formatListDate(earlier, now)).toBe('Sep 13')
    const lastYear = new Date(2025, 0, 2, 9, 0).toISOString()
    expect(formatListDate(lastYear, now)).toBe('Jan 2, 2025')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(Math.round(380.71 * 1024 * 1024))).toBe('380.71 MB')
    expect(formatBytes(10 * 1024 * 1024 * 1024)).toBe('10 GB')
  })

  it('parses address lists and reports invalid entries', () => {
    const r = parseAddressList('Dev Sharma <dev@mec.example>, priya@mec.example; not-an-email')
    expect(r.valid).toEqual([
      { name: 'Dev Sharma', email: 'dev@mec.example' },
      { name: '', email: 'priya@mec.example' },
    ])
    expect(r.invalid).toEqual(['not-an-email'])
  })

  it('builds initials and snippets', () => {
    expect(initials('Raif Mondal')).toBe('RM')
    expect(initials('Granola')).toBe('G')
    expect(snippetOf('a\n\nb   c', 10)).toBe('a b c')
    expect(snippetOf('x'.repeat(50), 10).length).toBe(10)
  })
})
