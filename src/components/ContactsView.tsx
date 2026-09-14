import { ArrowLeft, Mail, Pencil, Plus, Search, Star, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import { useUI } from '../store/UIContext'
import type { Contact } from '../types'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Form = Omit<Contact, 'id' | 'favorite'>

export function ContactsView() {
  const { state, dispatch } = useStore()
  const { openCompose } = useUI()
  const { push } = useToast()
  const navigate = useNavigate()
  const { contactId } = useParams<{ contactId?: string }>()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.contacts]
      .filter((c) => !q || `${c.name} ${c.email} ${c.company ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [state.contacts, query])

  const favorites = contacts.filter((c) => c.favorite)
  const others = contacts.filter((c) => !c.favorite)
  const selected = state.contacts.find((c) => c.id === contactId)

  const mailCount = (c: Contact) => state.messages.filter((m) => m.from.email === c.email || m.to.some((t) => t.email === c.email)).length

  const remove = (c: Contact) => {
    if (!window.confirm(`Delete ${c.name} from your contacts?`)) return
    dispatch({ type: 'deleteContact', id: c.id })
    navigate('/contacts')
    push(`${c.name} deleted`)
  }

  return (
    <div className={`content contacts`}>
      <div className="contacts-header">
        <h1>
          Contacts <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 16, marginLeft: 8 }}>{state.contacts.length}</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search" style={{ width: 280 }}>
            <span className="search-icon" style={{ left: 14 }}>
              <Search size={18} />
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" style={{ height: 44, paddingLeft: 42, paddingRight: 14, fontSize: 15 }} />
          </div>
          <button className="btn-primary small" onClick={() => setEditing('new')}>
            <Plus size={18} /> New contact
          </button>
        </div>
      </div>

      <div className={`contacts-body ${selected ? 'has-contact' : ''}`}>
        <div className="contacts-list">
          {contacts.length === 0 && (
            <div className="empty" style={{ height: 'auto', padding: 60 }}>
              <div className="empty-icon">
                <Users size={28} />
              </div>
              <h3>{query ? 'No matching contacts' : 'No contacts yet'}</h3>
              <p>{query ? 'Try a different name or email.' : 'People you email are easy to add from any message.'}</p>
            </div>
          )}
          {favorites.length > 0 && <div className="contact-group">Favourites</div>}
          {favorites.map((c) => (
            <ContactRow key={c.id} contact={c} selected={c.id === contactId} onClick={() => navigate(`/contacts/${c.id}`)} />
          ))}
          {others.length > 0 && favorites.length > 0 && <div className="contact-group">All contacts</div>}
          {others.map((c) => (
            <ContactRow key={c.id} contact={c} selected={c.id === contactId} onClick={() => navigate(`/contacts/${c.id}`)} />
          ))}
        </div>

        <div className="contact-detail">
          {selected ? (
            <>
              <button className="btn-ghost menu-toggle" style={{ marginBottom: 12 }} onClick={() => navigate('/contacts')}>
                <ArrowLeft size={18} /> All contacts
              </button>
              <div className="cd-head">
                <Avatar name={selected.name} email={selected.email} size="lg" />
                <div style={{ flex: 1 }}>
                  <h2>{selected.name}</h2>
                  <p>{selected.company || 'No company'}</p>
                </div>
                <button className={`icon-btn plain ${selected.favorite ? 'on' : ''}`} aria-label={selected.favorite ? 'Remove from favourites' : 'Add to favourites'} onClick={() => dispatch({ type: 'toggleContactFavorite', id: selected.id })}>
                  <Star size={22} fill={selected.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <dl>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${selected.email}`} onClick={(e) => { e.preventDefault(); openCompose({ to: `${selected.name} <${selected.email}>` }) }}>
                    {selected.email}
                  </a>
                </dd>
                <dt>Phone</dt>
                <dd>{selected.phone || '—'}</dd>
                <dt>Company</dt>
                <dd>{selected.company || '—'}</dd>
                <dt>Conversations</dt>
                <dd>{mailCount(selected)} message{mailCount(selected) === 1 ? '' : 's'}</dd>
              </dl>
              <div className="cd-actions">
                <button className="btn-primary small" onClick={() => openCompose({ to: `${selected.name} <${selected.email}>` })}>
                  <Mail size={16} /> Send email
                </button>
                <button className="btn-outline small" onClick={() => setEditing(selected)}>
                  <Pencil size={16} /> Edit
                </button>
                <button className="btn-outline small danger" onClick={() => remove(selected)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <UserPlus size={28} />
              </div>
              <h3>Select a contact</h3>
              <p>Pick someone from the list to see their details, or create a new contact.</p>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <ContactForm
          contact={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(form) => {
            if (editing === 'new') {
              dispatch({ type: 'addContact', contact: { ...form, favorite: false } })
              dispatch({ type: 'completeSetupStep', id: 'import' })
              push(`${form.name} added to contacts`)
            } else {
              dispatch({ type: 'updateContact', contact: { ...editing, ...form } })
              push('Contact updated')
            }
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ContactRow({ contact: c, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  return (
    <button className={`contact-row ${selected ? 'selected' : ''}`} onClick={onClick}>
      <Avatar name={c.name} email={c.email} size="sm" />
      <span className="c-text">
        <div className="c-name">{c.name}</div>
        <div className="c-email">{c.email}</div>
      </span>
      {c.favorite && <Star size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />}
    </button>
  )
}

function ContactForm({ contact, onClose, onSave }: { contact?: Contact; onClose: () => void; onSave: (form: Form) => void }) {
  const { state } = useStore()
  const [form, setForm] = useState<Form>({ name: contact?.name ?? '', email: contact?.email ?? '', company: contact?.company ?? '', phone: contact?.phone ?? '' })
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address.')
    const dup = state.contacts.find((c) => c.email.toLowerCase() === form.email.trim().toLowerCase() && c.id !== contact?.id)
    if (dup) return setError(`${dup.name} already uses this email address.`)
    onSave({ name: form.name.trim(), email: form.email.trim(), company: form.company?.trim() || undefined, phone: form.phone?.trim() || undefined })
  }

  return (
    <Modal
      title={contact ? 'Edit contact' : 'New contact'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline small" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary small" type="submit" form="contact-form">
            {contact ? 'Save' : 'Add contact'}
          </button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="c-company">Company</label>
            <input id="c-company" className="input" value={form.company ?? ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="c-phone">Phone</label>
            <input id="c-phone" className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
      </form>
    </Modal>
  )
}
