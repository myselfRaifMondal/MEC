import type { AppState, CustomFolder, FolderId, Message, MessageFilter, SortOrder } from '../types'

export const SYSTEM_FOLDER_LABELS: Record<Exclude<FolderId, `custom:${string}`>, string> = {
  inbox: 'Inbox',
  drafts: 'Drafts',
  scheduled: 'Scheduled',
  sent: 'Sent',
  spam: 'Spam',
  trash: 'Trash',
}

export function isSystemFolder(id: string): id is keyof typeof SYSTEM_FOLDER_LABELS {
  return id in SYSTEM_FOLDER_LABELS
}

export function folderLabel(id: FolderId, custom: CustomFolder[]): string {
  if (isSystemFolder(id)) return SYSTEM_FOLDER_LABELS[id]
  const key = id.replace(/^custom:/, '')
  return custom.find((f) => f.id === key)?.name ?? 'Folder'
}

export function unreadCount(messages: Message[], folder: FolderId): number {
  return messages.reduce((n, m) => (m.folder === folder && !m.read ? n + 1 : n), 0)
}

export function messageMatchesQuery(m: Message, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [m.subject, m.from.name, m.from.email, m.body, ...m.to.map((t) => `${t.name} ${t.email}`)]
    .join(' ')
    .toLowerCase()
  return needle.split(/\s+/).every((term) => hay.includes(term))
}

export interface ListQuery {
  folder: FolderId | null // null = search everywhere
  filter: MessageFilter
  sort: SortOrder
  search: string
}

export function listMessages(state: AppState, q: ListQuery): Message[] {
  const out = state.messages.filter((m) => {
    if (q.folder && m.folder !== q.folder) return false
    if (!q.folder && (m.folder === 'trash' || m.folder === 'spam') && !q.search) return false
    if (q.filter === 'unread' && m.read) return false
    if (q.filter === 'read' && !m.read) return false
    if (q.filter === 'starred' && !m.starred) return false
    return messageMatchesQuery(m, q.search)
  })
  out.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
    return q.sort === 'newest' ? diff : -diff
  })
  return out
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: safePage, pages }
}
