import { describe, expect, it } from 'vitest'
import { BCREC_MESSAGE_ID, BCREC_REPLY_ID, createSeedState } from '../data/seed'
import { migrate } from '../store/StoreContext'
import { reducer } from '../store/reducer'
import { listMessages, paginate, unreadCount } from '../store/queries'
import type { Message } from '../types'

const base = () => createSeedState()

describe('reducer', () => {
  it('marks messages read and unread', () => {
    const s = base()
    const id = s.messages[0].id
    const read = reducer(s, { type: 'markRead', ids: [id], read: true })
    expect(read.messages.find((m) => m.id === id)?.read).toBe(true)
    const unread = reducer(read, { type: 'markRead', ids: [id], read: false })
    expect(unread.messages.find((m) => m.id === id)?.read).toBe(false)
  })

  it('moves to trash, remembers the origin, and restores it', () => {
    const s = base()
    const id = s.messages.find((m) => m.folder === 'inbox')!.id
    const trashed = reducer(s, { type: 'trash', ids: [id] })
    const m = trashed.messages.find((x) => x.id === id)!
    expect(m.folder).toBe('trash')
    expect(m.previousFolder).toBe('inbox')
    const restored = reducer(trashed, { type: 'restore', ids: [id] })
    expect(restored.messages.find((x) => x.id === id)?.folder).toBe('inbox')
  })

  it('deletes permanently when trashing from trash and frees storage', () => {
    const s = base()
    const inTrash = s.messages.find((m) => m.folder === 'trash')!
    const next = reducer(s, { type: 'trash', ids: [inTrash.id] })
    expect(next.messages.some((m) => m.id === inTrash.id)).toBe(false)
    expect(next.storageUsedBytes).toBeLessThan(s.storageUsedBytes)
  })

  it('sends a message into Sent and removes the draft it came from', () => {
    const s = base()
    const draft = s.messages.find((m) => m.folder === 'drafts')!
    const next = reducer(s, {
      type: 'sendMessage',
      draftId: draft.id,
      message: { from: draft.from, to: draft.to, cc: [], bcc: [], subject: 'Hello', body: 'Body', attachments: [], hasCalendarInvite: false },
    })
    expect(next.messages.some((m) => m.id === draft.id)).toBe(false)
    expect(next.messages[0].folder).toBe('sent')
    expect(next.messages[0].subject).toBe('Hello')
  })

  it('updates the same draft on repeated saves', () => {
    const s = base()
    const msg = { from: s.messages[0].to[0], to: [], cc: [], bcc: [], subject: 'a', body: '', attachments: [], hasCalendarInvite: false }
    const first = reducer(s, { type: 'saveDraft', message: msg })
    const draftId = first.messages[0].id
    const second = reducer(first, { type: 'saveDraft', draftId, message: { ...msg, subject: 'ab' } })
    expect(second.messages.filter((m) => m.folder === 'drafts').length).toBe(first.messages.filter((m) => m.folder === 'drafts').length)
    expect(second.messages.find((m) => m.id === draftId)?.subject).toBe('ab')
  })

  it('delivers scheduled mail once its time has passed', () => {
    const s = base()
    const scheduled = s.messages.find((m) => m.folder === 'scheduled')!
    const before = reducer(s, { type: 'deliverScheduled', now: new Date(new Date(scheduled.scheduledFor!).getTime() - 1000).toISOString() })
    expect(before.messages.find((m) => m.id === scheduled.id)?.folder).toBe('scheduled')
    const after = reducer(s, { type: 'deliverScheduled', now: scheduled.scheduledFor! })
    expect(after.messages.find((m) => m.id === scheduled.id)?.folder).toBe('sent')
  })

  it('refuses duplicate folder names and moves mail back to inbox when a folder is deleted', () => {
    const s = base()
    const dup = reducer(s, { type: 'addFolder', name: 'receipts' })
    expect(dup.customFolders.length).toBe(s.customFolders.length)
    const withFolder = reducer(s, { type: 'addFolder', name: 'Investors' })
    const folder = withFolder.customFolders.find((f) => f.name === 'Investors')!
    const id = withFolder.messages[0].id
    const moved = reducer(withFolder, { type: 'moveTo', ids: [id], folder: `custom:${folder.id}` })
    expect(moved.messages.find((m) => m.id === id)?.folder).toBe(`custom:${folder.id}`)
    const deleted = reducer(moved, { type: 'deleteFolder', id: folder.id })
    expect(deleted.messages.find((m) => m.id === id)?.folder).toBe('inbox')
  })
})

describe('queries', () => {
  it('filters by folder, read state and search text', () => {
    const s = base()
    const inbox = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'newest', search: '' })
    expect(inbox.every((m) => m.folder === 'inbox')).toBe(true)
    const unread = listMessages(s, { folder: 'inbox', filter: 'unread', sort: 'newest', search: '' })
    expect(unread.every((m) => !m.read)).toBe(true)
    expect(unread.length).toBe(unreadCount(s.messages, 'inbox'))
    const nvidia = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'newest', search: 'nvidia' })
    expect(nvidia.length).toBeGreaterThanOrEqual(2)
    expect(nvidia.every((m) => /nvidia/i.test(`${m.from.name} ${m.subject} ${m.body}`))).toBe(true)
  })

  it('sorts newest first by default and oldest when asked', () => {
    const s = base()
    const newest = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'newest', search: '' })
    const oldest = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'oldest', search: '' })
    expect(new Date(newest[0].date).getTime()).toBeGreaterThanOrEqual(new Date(newest[1].date).getTime())
    expect(oldest[0].id).toBe(newest[newest.length - 1].id)
  })

  it('paginates and clamps the page number', () => {
    const items: Message[] = base().messages
    const p1 = paginate(items, 1, 10)
    expect(p1.items.length).toBe(10)
    expect(p1.pages).toBe(Math.ceil(items.length / 10))
    const clamped = paginate(items, 999, 10)
    expect(clamped.page).toBe(p1.pages)
  })

  it('seed inbox fills twelve pages of ten with 26 unread', () => {
    const s = base()
    const inbox = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'newest', search: '' })
    expect(paginate(inbox, 1, 10).pages).toBe(12)
    expect(unreadCount(s.messages, 'inbox')).toBe(26)
  })

  it('puts the BCREC notice with its PDF first in the inbox', () => {
    const s = base()
    const inbox = listMessages(s, { folder: 'inbox', filter: 'all', sort: 'newest', search: '' })
    expect(inbox[0].id).toBe(BCREC_MESSAGE_ID)
    expect(inbox[0].from.email).toBe('info@bcrec.ac.in')
    expect(inbox[0].attachments[0]).toMatchObject({ name: 'IndiQuant-BCREC.pdf', type: 'application/pdf', url: '/attachments/IndiQuant-BCREC.pdf' })
  })

  it('migrates a saved mailbox that predates the BCREC notice', () => {
    const s = base()
    const old = { ...s, messages: s.messages.filter((m) => m.id !== BCREC_MESSAGE_ID) }
    const migrated = migrate(old)
    expect(migrated.messages[0].id).toBe(BCREC_MESSAGE_ID)
    expect(migrate(migrated)).toBe(migrated)
  })

  it('seeds the reimbursement reply to BCREC as the newest sent message', () => {
    const s = base()
    const sent = listMessages(s, { folder: 'sent', filter: 'all', sort: 'newest', search: '' })
    expect(sent[0].id).toBe(BCREC_REPLY_ID)
    expect(sent[0].to[0].email).toBe('info@bcrec.ac.in')
    expect(sent[0].inReplyTo).toBe(BCREC_MESSAGE_ID)
    expect(sent[0].subject.startsWith('Re: ')).toBe(true)
    expect(sent[0].body).toContain('IIT Kharagpur')
    expect(sent[0].body).toContain('EF (Entrepreneur First) Selection Hackathon')
    const withoutReply = { ...s, messages: s.messages.filter((m) => m.id !== BCREC_REPLY_ID) }
    expect(migrate(withoutReply).messages.some((m) => m.id === BCREC_REPLY_ID)).toBe(true)
  })

  it('backfills rich HTML bodies onto saved seed messages', () => {
    const s = base()
    const stripped = { ...s, messages: s.messages.map((m) => ({ ...m, html: undefined })) }
    const migrated = migrate(stripped)
    expect(migrated.messages.find((m) => m.id === BCREC_MESSAGE_ID)?.html).toContain('NOTICE')
    expect(migrated.messages.filter((m) => m.html).length).toBe(s.messages.filter((m) => m.html).length)
  })
})
