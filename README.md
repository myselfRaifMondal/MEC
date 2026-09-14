# MEC · Hostinger Mail clone

A pixel-faithful, fully working clone of the Hostinger Mail web client, built with React, TypeScript and Vite. Everything runs in the browser: the mailbox is seeded with demo mail and every change you make is persisted to `localStorage`, so it behaves like a real client without needing a backend.

## Features

**Mailbox**
- Inbox, Drafts, Scheduled, Sent, Spam and Trash, plus custom folders (create, rename, delete)
- Unread counters, storage meter and the 5/7 setup guide from the sidebar
- Message list with All mail / Unread / Read / Starred filters, newest/oldest sort and 10-per-page pagination (`1/12`)
- Select-all with a dropdown (page, none, unread, read, starred) and bulk actions: mark read/unread, star, move, spam, delete, restore
- Reading pane beside the list or hidden (eye icon), comfortable/compact density, optional preview snippets
- Search across the current folder or all folders, with attachment-only and unread-only options

**Reading**
- Preview with sender details, calendar-invite RSVP card, attachment chips (real files under `public/attachments` download; the BCREC IndiQuant notice ships with its PDF), and prev/next navigation
- Reply, reply all, forward (with quoted text and signature), mark unread, star, move to folder, spam, delete, print, download as `.eml`
- Trash and Spam notices with restore; empty Trash / empty Spam

**Composing**
- Docked compose window that minimises, expands, autosaves drafts, and reopens drafts from the Drafts folder
- To/Cc/Bcc with address validation and contact autocomplete, subject, attachments (up to 25 MB), discard
- Send now (`Ctrl/⌘ + Enter`) or schedule send (presets or a custom date/time); scheduled mail moves to Sent automatically when due
- Sending to a `no-reply` address produces a Postmaster bounce, like the one in the seed inbox

**Everything else**
- Contacts page with favourites, search, create/edit/delete and one-click email
- Ask AI panel that summarises the open message, drafts short/polite/decline replies, forwards, and answers inbox digests (generated locally, no model calls)
- Settings: display name, signature, messages per page, reading pane, density, read-on-open, snippets, reset/export mailbox
- Refer a friend, upgrade storage, send feedback and setup-guide dialogs
- Keyboard shortcuts (`?` to see them): `c`, `/`, `j`/`k`, `s`, `u`, `Del`, `Esc`
- Responsive down to phone width, dark theme throughout

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # vitest unit tests for the reducer, queries and formatters
npm run typecheck  # tsc only
```

## Project layout

```
src/
  components/   Sidebar, TopBar, MailView, MessageRow, MessagePreview, Compose,
                ContactsView, SettingsModal, AskAIPanel, Modals, shared widgets
  store/        reducer + actions, list/search/pagination queries, React contexts
  data/seed.ts  demo mailbox (messages, contacts, folders, settings)
  utils/        date/size/address formatting, route helpers
  test/         vitest specs
```

State lives in a single reducer (`src/store/reducer.ts`) and is persisted under the `hostinger-mail-clone:v1` key. Use **Settings → Data → Reset demo mailbox** to restore the original seed.

## Also in this repository: mideast-3d

`mideast-3d/` is a separate app: an interactive, sourced 3D globe timeline of the Middle East crisis (1917 to September 2026), built with Vite, React, TypeScript and three.js. See [`mideast-3d/README.md`](mideast-3d/README.md) for how to run, build and deploy it, and for its data methodology. To deploy it on Vercel, create a project for this repository with **Root Directory** set to `mideast-3d` (framework Vite, output `dist`); the root `vercel.json` belongs to the mail client.
