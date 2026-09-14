import { useState } from 'react'
import { resetDemoData, useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import type { Settings } from '../types'
import { Modal } from './Modal'

type Tab = 'general' | 'reading' | 'signature' | 'data'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const { push } = useToast()
  const [tab, setTab] = useState<Tab>('general')
  const [form, setForm] = useState<Settings>(state.settings)
  const [nameError, setNameError] = useState<string | null>(null)

  const save = () => {
    if (!form.displayName.trim()) {
      setNameError('Display name cannot be empty.')
      setTab('general')
      return
    }
    dispatch({ type: 'updateSettings', settings: { ...form, displayName: form.displayName.trim(), signature: form.signature.trim() } })
    if (form.signature.trim()) dispatch({ type: 'completeSetupStep', id: 'signature' })
    push('Settings saved')
    onClose()
  }

  const Toggle = ({ k, title, text }: { k: keyof Pick<Settings, 'markReadOnOpen' | 'showSnippets'>; title: string; text: string }) => (
    <div className="toggle-row">
      <div className="toggle-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <button role="switch" aria-checked={form[k]} aria-label={title} className={`switch ${form[k] ? 'on' : ''}`} onClick={() => setForm({ ...form, [k]: !form[k] })} />
    </div>
  )

  return (
    <Modal
      title="Settings"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn-outline small" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary small" onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      <div className="tabs" style={{ margin: '-22px -24px 20px', padding: '0 16px' }}>
        {(['general', 'reading', 'signature', 'data'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'general' ? 'General' : t === 'reading' ? 'Reading' : t === 'signature' ? 'Signature' : 'Data'}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <>
          <div className="field">
            <label htmlFor="s-name">Display name</label>
            <input id="s-name" className={`input ${nameError ? 'invalid' : ''}`} value={form.displayName} onChange={(e) => { setForm({ ...form, displayName: e.target.value }); setNameError(null) }} />
            {nameError && <span className="error-text">{nameError}</span>}
            <span className="hint">Shown to people who receive your mail.</span>
          </div>
          <div className="field">
            <label htmlFor="s-email">Email address</label>
            <input id="s-email" className="input" value={form.email} readOnly />
            <span className="hint">Managed from hPanel. Aliases can be added under Email accounts.</span>
          </div>
          <div className="field">
            <label htmlFor="s-page">Messages per page</label>
            <select id="s-page" className="select" value={form.pageSize} onChange={(e) => setForm({ ...form, pageSize: Number(e.target.value) })}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {tab === 'reading' && (
        <>
          <div className="field">
            <label>Reading pane</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`chip ${form.readingPane === 'right' ? 'active' : ''}`} onClick={() => setForm({ ...form, readingPane: 'right' })}>
                Beside the list
              </button>
              <button className={`chip ${form.readingPane === 'off' ? 'active' : ''}`} onClick={() => setForm({ ...form, readingPane: 'off' })}>
                Hidden
              </button>
            </div>
          </div>
          <div className="field">
            <label>Density</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`chip ${form.density === 'comfortable' ? 'active' : ''}`} onClick={() => setForm({ ...form, density: 'comfortable' })}>
                Comfortable
              </button>
              <button className={`chip ${form.density === 'compact' ? 'active' : ''}`} onClick={() => setForm({ ...form, density: 'compact' })}>
                Compact
              </button>
            </div>
          </div>
          <Toggle k="markReadOnOpen" title="Mark as read when opened" text="Turn off to keep messages unread until you mark them manually." />
          <Toggle k="showSnippets" title="Show message preview text" text="Adds the first line of each message under the subject." />
        </>
      )}

      {tab === 'signature' && (
        <div className="field">
          <label htmlFor="s-sig">Signature</label>
          <textarea id="s-sig" className="textarea" rows={6} value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} placeholder="Added to the end of new messages and replies" />
          <span className="hint">Plain text. Leave empty to disable.</span>
        </div>
      )}

      {tab === 'data' && (
        <>
          <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
            This client keeps everything in your browser's local storage. Nothing is sent to a server.
          </p>
          <div className="toggle-row">
            <div className="toggle-text">
              <strong>Reset demo mailbox</strong>
              <span>Restores the original sample messages, contacts and folders.</span>
            </div>
            <button
              className="btn-outline small danger"
              onClick={() => {
                if (!window.confirm('Reset the mailbox to its original demo state? Your changes will be lost.')) return
                dispatch({ type: 'reset', state: resetDemoData() })
                push('Mailbox reset')
                onClose()
              }}
            >
              Reset
            </button>
          </div>
          <div className="toggle-row">
            <div className="toggle-text">
              <strong>Export mailbox</strong>
              <span>Download all messages as a JSON file.</span>
            </div>
            <button
              className="btn-outline small"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'mailbox-export.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Export
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
