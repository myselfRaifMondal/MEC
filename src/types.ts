export type SystemFolder = 'inbox' | 'drafts' | 'scheduled' | 'sent' | 'spam' | 'trash'
export type FolderId = SystemFolder | `custom:${string}`

export interface Address {
  name: string
  email: string
}

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  /** Path of a real file served with the app; attachments without one are demo placeholders. */
  url?: string
}

export interface Message {
  id: string
  folder: FolderId
  from: Address
  to: Address[]
  cc: Address[]
  bcc: Address[]
  subject: string
  /** Plain-text body; paragraphs are separated by blank lines. Used for quoting, search and AI summaries. */
  body: string
  /** Optional rich HTML version of the body, rendered in place of the plain text when present. Seed data only. */
  html?: string
  date: string
  read: boolean
  starred: boolean
  attachments: Attachment[]
  hasCalendarInvite: boolean
  /** Folder the message lived in before it was moved to trash or spam. */
  previousFolder?: FolderId
  /** ISO timestamp for messages sitting in "Scheduled". */
  scheduledFor?: string
  /** id of the message this one replies to or forwards. */
  inReplyTo?: string
}

export interface CustomFolder {
  id: string
  name: string
}

export interface Contact {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  favorite: boolean
}

export type ReadingPane = 'right' | 'off'
export type Density = 'comfortable' | 'compact'

export interface Settings {
  displayName: string
  email: string
  signature: string
  readingPane: ReadingPane
  density: Density
  pageSize: number
  markReadOnOpen: boolean
  showSnippets: boolean
}

export interface SetupStep {
  id: string
  label: string
  done: boolean
}

export interface AppState {
  messages: Message[]
  customFolders: CustomFolder[]
  contacts: Contact[]
  settings: Settings
  setupSteps: SetupStep[]
  storageUsedBytes: number
  storageQuotaBytes: number
}

export type MessageFilter = 'all' | 'unread' | 'read' | 'starred'
export type SortOrder = 'newest' | 'oldest'

export interface ComposeDraft {
  id?: string
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments: Attachment[]
  inReplyTo?: string
}
