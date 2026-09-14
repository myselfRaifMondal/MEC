import { Send, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useUI } from '../store/UIContext'
import type { Message } from '../types'
import { formatFullDate } from '../utils/format'
import { forwardSubject, quoteBody, replySubject } from './MessagePreview'

interface Turn {
  role: 'user' | 'assistant'
  text: string
}

function sentences(body: string): string[] {
  return body
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
}

function summarize(m: Message): string {
  const s = sentences(m.body)
  const picked = s.slice(0, 3)
  const asks = s.filter((x) => /\b(please|click|confirm|submit|register|reply|schedule|attend|join|verify)\b/i.test(x)).slice(0, 2)
  const lines = [`Summary of "${m.subject}" from ${m.from.name || m.from.email}:`, '', ...picked.map((p) => `• ${p}`)]
  if (asks.length) lines.push('', 'Action items:', ...asks.map((a) => `• ${a}`))
  if (m.attachments.length) lines.push('', `Attachments: ${m.attachments.map((a) => a.name).join(', ')}`)
  return lines.join('\n')
}

function draftReply(m: Message, tone: 'short' | 'polite' | 'decline'): string {
  const first = (m.from.name || 'there').split(' ')[0]
  if (tone === 'decline') return `Hi ${first},\n\nThanks for reaching out. This is not something we can take on right now, but I appreciate you thinking of us.\n\nBest regards`
  if (tone === 'short') return `Hi ${first},\n\nThanks, received. I will get back to you shortly.\n\nBest`
  return `Hi ${first},\n\nThank you for your message about "${m.subject}". I have read through it and will follow up with the details you need by the end of the week.\n\nPlease let me know if there is anything time-sensitive in the meantime.\n\nKind regards`
}

export function AskAIPanel() {
  const { state } = useStore()
  const { aiOpen, setAiOpen, openCompose } = useUI()
  const match = useMatch('/:folder/:messageId')
  const messageId = match && match.params.folder !== 'contacts' ? match.params.messageId : undefined
  const message = useMemo(() => state.messages.find((m) => m.id === messageId), [state.messages, messageId])
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [turns])

  useEffect(() => {
    if (aiOpen) setTurns([])
  }, [aiOpen, messageId])

  if (!aiOpen) return null

  const unread = state.messages.filter((m) => m.folder === 'inbox' && !m.read)

  const answer = (q: string): string => {
    const lower = q.toLowerCase()
    if (message && /summar|tl;dr|what is this|about/.test(lower)) return summarize(message)
    if (message && /reply|respond|answer/.test(lower)) {
      const tone = /decline|no\b|reject/.test(lower) ? 'decline' : /short|quick|brief/.test(lower) ? 'short' : 'polite'
      openCompose({ to: `${message.from.name} <${message.from.email}>`, subject: replySubject(message.subject), body: `${draftReply(message, tone)}${quoteBody(message)}`, inReplyTo: message.id })
      return `I drafted a ${tone} reply to ${message.from.name || message.from.email} and opened it in the compose window. Edit it before sending.`
    }
    if (message && /forward/.test(lower)) {
      openCompose({ subject: forwardSubject(message.subject), body: `\n\n---------- Forwarded message ----------\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${formatFullDate(message.date)}\nSubject: ${message.subject}\n\n${message.body}`, attachments: message.attachments, inReplyTo: message.id })
      return 'Opened a forward of this message. Add the recipient and send.'
    }
    if (message && /translate/.test(lower)) return 'Translation is not available in this demo build. The message is already in English.'
    if (/unread|catch me up|what did i miss|inbox/.test(lower)) {
      if (unread.length === 0) return 'Your inbox has no unread messages. Nice work.'
      const top = unread.slice(0, 5).map((m) => `• ${m.from.name || m.from.email}: ${m.subject}`)
      return `You have ${unread.length} unread message${unread.length === 1 ? '' : 's'} in Inbox. The most recent:\n\n${top.join('\n')}${unread.length > 5 ? `\n\n…and ${unread.length - 5} more.` : ''}`
    }
    if (/attachment/.test(lower)) {
      const withAtt = state.messages.filter((m) => m.folder === 'inbox' && m.attachments.length > 0).slice(0, 5)
      return withAtt.length ? `Recent messages with attachments:\n\n${withAtt.map((m) => `• ${m.subject} (${m.attachments.map((a) => a.name).join(', ')})`).join('\n')}` : 'No messages in Inbox have attachments.'
    }
    if (/from (.+)/.test(lower)) {
      const who = lower.match(/from (.+)/)?.[1]?.replace(/[?.]/g, '').trim() ?? ''
      const hits = state.messages.filter((m) => m.folder !== 'trash' && `${m.from.name} ${m.from.email}`.toLowerCase().includes(who)).slice(0, 5)
      return hits.length ? `Messages from "${who}":\n\n${hits.map((m) => `• ${m.subject}`).join('\n')}` : `I could not find any mail from "${who}".`
    }
    if (/write|compose|draft|email to/.test(lower)) {
      openCompose({ body: '' })
      return 'Opened a new message. Tell me the recipient and what it should say and I will fill it in, or type it yourself.'
    }
    if (!message) return 'Open a message first and I can summarise it, draft a reply or forward it. You can also ask "what did I miss?" for an inbox digest.'
    return `I can summarise this message, draft a reply (short, polite or a decline), forward it, or find mail from a sender. Try one of the suggestions below.`
  }

  const ask = (q: string) => {
    const question = q.trim()
    if (!question) return
    setInput('')
    setTurns((t) => [...t, { role: 'user', text: question }])
    window.setTimeout(() => setTurns((t) => [...t, { role: 'assistant', text: answer(question) }]), 350)
  }

  const chips = message
    ? ['Summarise this message', 'Draft a polite reply', 'Draft a short reply', 'Politely decline', 'Forward this']
    : ['What did I miss?', 'Which messages have attachments?', 'Show mail from NVIDIA']

  return (
    <div className="ai-panel" role="dialog" aria-label="Ask AI">
      <div className="ai-head">
        <span className="ai-title">
          <Sparkles size={18} style={{ color: 'var(--accent)' }} /> Ask AI
        </span>
        <button className="icon-btn plain" aria-label="Close Ask AI" onClick={() => setAiOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="ai-body" ref={bodyRef}>
        {turns.length === 0 && (
          <div className="ai-msg assistant">
            {message ? `Looking at "${message.subject}" from ${message.from.name || message.from.email}. What would you like to do with it?` : 'Hi! I can summarise messages, draft replies and dig through your inbox. Open a message or pick a suggestion.'}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`ai-msg ${t.role}`}>
            {t.text}
          </div>
        ))}
        <div className="ai-chips">
          {chips.map((c) => (
            <button key={c} className="chip" onClick={() => ask(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your mail…" aria-label="Ask AI" />
        <button className="btn-primary small" type="submit" aria-label="Send question" disabled={!input.trim()}>
          <Send size={16} />
        </button>
      </form>
      <div className="ai-disclaimer">Demo assistant: responses are generated locally from your mailbox, not by a language model.</div>
    </div>
  )
}
