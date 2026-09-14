import type { Address, AppState, Attachment, Contact, CustomFolder, FolderId, Message, Settings } from '../types'
import { uid } from '../utils/format'

export type Action =
  | { type: 'markRead'; ids: string[]; read: boolean }
  | { type: 'toggleStar'; id: string }
  | { type: 'setStar'; ids: string[]; starred: boolean }
  | { type: 'moveTo'; ids: string[]; folder: FolderId }
  | { type: 'trash'; ids: string[] }
  | { type: 'restore'; ids: string[] }
  | { type: 'deleteForever'; ids: string[] }
  | { type: 'emptyFolder'; folder: FolderId }
  | { type: 'sendMessage'; message: Omit<Message, 'id' | 'folder' | 'read' | 'starred' | 'date'>; draftId?: string }
  | { type: 'scheduleMessage'; message: Omit<Message, 'id' | 'folder' | 'read' | 'starred' | 'date'>; sendAt: string; draftId?: string }
  | { type: 'saveDraft'; message: Omit<Message, 'folder' | 'read' | 'starred' | 'date' | 'id'>; draftId?: string }
  | { type: 'discardDraft'; id: string }
  | { type: 'deliverScheduled'; now: string }
  | { type: 'addFolder'; name: string }
  | { type: 'renameFolder'; id: string; name: string }
  | { type: 'deleteFolder'; id: string }
  | { type: 'addContact'; contact: Omit<Contact, 'id'> }
  | { type: 'updateContact'; contact: Contact }
  | { type: 'deleteContact'; id: string }
  | { type: 'toggleContactFavorite'; id: string }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'completeSetupStep'; id: string }
  | { type: 'receiveMessage'; message: Message }
  | { type: 'reset'; state: AppState }

function patch(messages: Message[], ids: string[], fn: (m: Message) => Message): Message[] {
  const set = new Set(ids)
  return messages.map((m) => (set.has(m.id) ? fn(m) : m))
}

function sizeOf(attachments: Attachment[], body: string): number {
  return attachments.reduce((n, a) => n + a.size, 0) + body.length * 2 + 2048
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'markRead':
      return { ...state, messages: patch(state.messages, action.ids, (m) => ({ ...m, read: action.read })) }

    case 'toggleStar':
      return { ...state, messages: patch(state.messages, [action.id], (m) => ({ ...m, starred: !m.starred })) }

    case 'setStar':
      return { ...state, messages: patch(state.messages, action.ids, (m) => ({ ...m, starred: action.starred })) }

    case 'moveTo':
      return {
        ...state,
        messages: patch(state.messages, action.ids, (m) => ({
          ...m,
          previousFolder: action.folder === 'trash' || action.folder === 'spam' ? m.folder : undefined,
          folder: action.folder,
        })),
      }

    case 'trash': {
      // Messages already in trash are deleted permanently, everything else moves to trash.
      const set = new Set(action.ids)
      const kept: Message[] = []
      let freed = 0
      for (const m of state.messages) {
        if (!set.has(m.id)) {
          kept.push(m)
        } else if (m.folder === 'trash') {
          freed += sizeOf(m.attachments, m.body)
        } else {
          kept.push({ ...m, previousFolder: m.folder, folder: 'trash' })
        }
      }
      return { ...state, messages: kept, storageUsedBytes: Math.max(0, state.storageUsedBytes - freed) }
    }

    case 'restore':
      return {
        ...state,
        messages: patch(state.messages, action.ids, (m) => ({
          ...m,
          folder: m.previousFolder && m.previousFolder !== 'trash' && m.previousFolder !== 'spam' ? m.previousFolder : 'inbox',
          previousFolder: undefined,
        })),
      }

    case 'deleteForever': {
      const set = new Set(action.ids)
      let freed = 0
      const kept = state.messages.filter((m) => {
        if (!set.has(m.id)) return true
        freed += sizeOf(m.attachments, m.body)
        return false
      })
      return { ...state, messages: kept, storageUsedBytes: Math.max(0, state.storageUsedBytes - freed) }
    }

    case 'emptyFolder':
      return reducer(state, {
        type: 'deleteForever',
        ids: state.messages.filter((m) => m.folder === action.folder).map((m) => m.id),
      })

    case 'sendMessage': {
      const sent: Message = {
        ...action.message,
        id: uid('sent'),
        folder: 'sent',
        read: true,
        starred: false,
        date: new Date().toISOString(),
      }
      const messages = state.messages.filter((m) => m.id !== action.draftId)
      return {
        ...state,
        messages: [sent, ...messages],
        storageUsedBytes: state.storageUsedBytes + sizeOf(sent.attachments, sent.body),
      }
    }

    case 'scheduleMessage': {
      const scheduled: Message = {
        ...action.message,
        id: uid('sch'),
        folder: 'scheduled',
        read: true,
        starred: false,
        date: new Date().toISOString(),
        scheduledFor: action.sendAt,
      }
      const messages = state.messages.filter((m) => m.id !== action.draftId)
      return { ...state, messages: [scheduled, ...messages] }
    }

    case 'saveDraft': {
      const existing = action.draftId ? state.messages.find((m) => m.id === action.draftId) : undefined
      const draft: Message = {
        ...(existing ?? { starred: false }),
        ...action.message,
        id: existing?.id ?? uid('draft'),
        folder: 'drafts',
        read: true,
        starred: existing?.starred ?? false,
        date: new Date().toISOString(),
      }
      const others = state.messages.filter((m) => m.id !== draft.id)
      return { ...state, messages: [draft, ...others] }
    }

    case 'discardDraft':
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) }

    case 'deliverScheduled': {
      const due = new Date(action.now).getTime()
      let changed = false
      const messages = state.messages.map((m) => {
        if (m.folder === 'scheduled' && m.scheduledFor && new Date(m.scheduledFor).getTime() <= due) {
          changed = true
          return { ...m, folder: 'sent' as FolderId, date: m.scheduledFor, scheduledFor: undefined }
        }
        return m
      })
      return changed ? { ...state, messages } : state
    }

    case 'addFolder': {
      const name = action.name.trim()
      if (!name || state.customFolders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return state
      const folder: CustomFolder = { id: uid('f'), name }
      return { ...state, customFolders: [...state.customFolders, folder] }
    }

    case 'renameFolder': {
      const name = action.name.trim()
      if (!name) return state
      return { ...state, customFolders: state.customFolders.map((f) => (f.id === action.id ? { ...f, name } : f)) }
    }

    case 'deleteFolder': {
      const folderId: FolderId = `custom:${action.id}`
      return {
        ...state,
        customFolders: state.customFolders.filter((f) => f.id !== action.id),
        messages: state.messages.map((m) => (m.folder === folderId ? { ...m, folder: 'inbox' } : m)),
      }
    }

    case 'addContact':
      return { ...state, contacts: [...state.contacts, { ...action.contact, id: uid('c') }] }

    case 'updateContact':
      return { ...state, contacts: state.contacts.map((c) => (c.id === action.contact.id ? action.contact : c)) }

    case 'deleteContact':
      return { ...state, contacts: state.contacts.filter((c) => c.id !== action.id) }

    case 'toggleContactFavorite':
      return { ...state, contacts: state.contacts.map((c) => (c.id === action.id ? { ...c, favorite: !c.favorite } : c)) }

    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } }

    case 'completeSetupStep':
      return { ...state, setupSteps: state.setupSteps.map((s) => (s.id === action.id ? { ...s, done: true } : s)) }

    case 'receiveMessage':
      return {
        ...state,
        messages: [action.message, ...state.messages],
        storageUsedBytes: state.storageUsedBytes + sizeOf(action.message.attachments, action.message.body),
      }

    case 'reset':
      return action.state

    default:
      return state
  }
}

export function folderIdForCustom(folder: CustomFolder): FolderId {
  return `custom:${folder.id}`
}

export function addressesToString(list: Address[]): string {
  return list.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ')
}
