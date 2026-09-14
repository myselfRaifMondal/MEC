import type { AppState, Attachment, Contact, Message, Settings, SetupStep } from '../types'

export const ME = { name: 'Raif Mondal', email: 'raif@mec.example' }

const MB = 1024 * 1024

function at(daysAgo: number, hour: number, minute: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function attach(name: string, size: number, type: string, url?: string): Attachment {
  return { id: `att_${name.replace(/\W/g, '')}`, name, size, type, url }
}

export const BCREC_MESSAGE_ID = 'seed_bcrec_indiquant'

/** Notice from BCREC with the IndiQuant press-meet PDF attached; always the newest inbox message. */
export function bcrecNotice(): Message {
  return {
    id: BCREC_MESSAGE_ID,
    folder: 'inbox',
    from: { name: 'Dr. B. C. Roy Engineering College', email: 'info@bcrec.ac.in' },
    to: [ME],
    cc: [],
    bcc: [],
    subject: 'Notice: Press Meet for the Felicitation of IndiQuant – 16 September 2026',
    date: at(0, 9, 5),
    read: false,
    starred: false,
    hasCalendarInvite: true,
    attachments: [attach('IndiQuant-BCREC.pdf', 388778, 'application/pdf', '/attachments/IndiQuant-BCREC.pdf')],
    body: `Ref. No.: BCREC/PR/2026-27/1
Date: 13.09.2026

Dear Representatives of IndiQuant,

This is to notify you that Dr. B. C. Roy Engineering College, Durgapur, will be hosting a Press Meet on Wednesday, 16th September 2026 at 11:00 A.M. in the Albert Einstein Hall, BCREC campus, on the occasion of the Felicitation of IndiQuant.

Representatives of IndiQuant are cordially invited to be present on the occasion. Members of the press and media are being invited to cover the event. The list of media houses proposed to be invited, covering regional outlets such as Anandabazar Patrika, Ei Samay and ABP Ananda as well as national outlets including The Telegraph, The Times of India, Hindustan Times and PTI, is enclosed in the attached notice for your reference and confirmation.

All concerned departments and committees (Media & Public Relations Cell, Administration, Security and Hospitality) have been requested to extend the necessary cooperation for the smooth conduct of the programme.

Kindly confirm your attendance by replying to this email.

Warm regards,
General Secretary
Dr. B. C. Roy Engineering College, Durgapur
info@bcrec.ac.in`,
  }
}

let counter = 0
function msg(partial: Partial<Message> & Pick<Message, 'from' | 'subject' | 'body' | 'date'>): Message {
  counter += 1
  return {
    id: `seed_${counter.toString().padStart(3, '0')}`,
    folder: 'inbox',
    to: [ME],
    cc: [],
    bcc: [],
    read: false,
    starred: false,
    attachments: [],
    hasCalendarInvite: false,
    ...partial,
  }
}

/** The first page of the inbox mirrors the reference screenshot. */
function featured(): Message[] {
  return [
  msg({
    from: { name: 'NVIDIA Training', email: 'training@nvidia.example' },
    subject: 'Welcome to NVIDIA Academy: Verification required',
    date: at(0, 4, 27),
    body: `Hi Raif,

Welcome to NVIDIA Academy. Before you can access the Deep Learning Institute catalog we need to verify your email address.

Click the verification link in your account dashboard within the next 48 hours. Once verified you will get access to self-paced courses, instructor-led workshops and certification tracks.

If you did not create this account, you can safely ignore this message.

The NVIDIA Training team`,
  }),
  msg({
    from: { name: 'NVIDIA Inception Program', email: 'inception@nvidia.example' },
    subject: 'We received your NVIDIA Inception program application',
    date: at(0, 4, 27),
    body: `Hello Raif,

Thank you for applying to the NVIDIA Inception program. Our team has received your application for MEC and will review it over the coming weeks.

Inception members receive technical training, preferred pricing on hardware, go-to-market support and access to our venture capital alliance. You will hear from us as soon as a decision has been made.

Best regards,
NVIDIA Inception`,
  }),
  msg({
    from: { name: 'Granola', email: 'hello@granola.example' },
    subject: "How's it going?",
    date: at(1, 9, 12),
    body: `Hey Raif,

You installed Granola a few days ago and we wanted to check in. Have you had a chance to take notes in a meeting yet?

A few things people love: automatic meeting summaries, action items pulled out of the transcript, and a template for one-on-ones.

If anything is confusing, just reply to this email. A real human reads every response.

Chris
Co-founder, Granola`,
  }),
  msg({
    from: { name: 'GetProspect', email: 'team@getprospect.example' },
    subject: 'Start using single enrich by company, lead or domain',
    date: at(2, 14, 5),
    body: `Hi there,

Single enrich lets you find verified emails and company data one record at a time, straight from the dashboard.

Paste a domain, a LinkedIn URL or a company name and we will return the decision makers, their roles and a confidence score for each email.

Your plan includes 50 free enrichments this month.

The GetProspect team`,
  }),
  msg({
    from: { name: 'Anthropic Webinars', email: 'webinars@anthropic.example' },
    subject: '[Webinar] Scaling Claude with Cost Controls',
    date: at(2, 11, 30),
    body: `Join us for a live session on scaling Claude deployments while keeping spend predictable.

We will cover prompt caching, batch processing, model routing between Haiku and Opus, and how to set budgets per team.

Date: Thursday, 10:00 AM PT
Duration: 45 minutes with live Q&A

Save your seat from the events page. A recording will be sent to everyone who registers.`,
    hasCalendarInvite: true,
  }),
  msg({
    from: { name: 'IIT Bombay', email: 'eureka@ecell.iitb.example' },
    subject: 'Eureka! 2026 | Your Eureka! 2026 Journey | Quarter Finals',
    date: at(3, 16, 45),
    body: `Dear Participant,

Congratulations! Your startup has been shortlisted for the Quarter Finals of Eureka! 2026, Asia's largest business model competition.

Next steps:
1. Submit your updated pitch deck by the deadline on the portal.
2. Attend the mentoring session assigned to your track.
3. Prepare for a 10 minute pitch followed by 5 minutes of questions.

We look forward to seeing you in the next round.

Team E-Cell, IIT Bombay`,
  }),
  msg({
    from: { name: 'SANA YAQOOB', email: 'sana@firstwings.example' },
    subject: 'Join FIRSTWINGS Connect Webinar with our founders',
    date: at(3, 10, 20),
    body: `Hi Raif,

You are invited to the FIRSTWINGS Connect webinar where three founders from our latest cohort share how they raised their pre-seed rounds.

Agenda:
- Building a narrative that investors remember
- Finding the right angels for your sector
- Live Q&A

The calendar invite and the deck from our last session are attached.

Warm regards,
Sana Yaqoob`,
    hasCalendarInvite: true,
    attachments: [attach('FIRSTWINGS-Connect.ics', 4 * 1024, 'text/calendar'), attach('Founder-Deck.pdf', 2.4 * MB, 'application/pdf')],
  }),
  msg({
    from: { name: 'GrowthX from Build with AI', email: 'growthx@buildwithai.example' },
    subject: 'I almost lost $100 on email. AI caught it.',
    date: at(3, 8, 2),
    body: `Last week I nearly paid an invoice that looked identical to one from a vendor we use every month. Same logo, same signature, same tone.

The only difference was the bank account number.

Our inbox assistant flagged the mismatch before I hit send. That is the kind of workflow we teach in the Build with AI cohort: small automations that pay for themselves the first time they fire.

Enrollment closes Friday.`,
  }),
  msg({
    from: { name: 'Anjali Bansiwal', email: 'anjali@securedge.example' },
    subject: 'Shield Your Business With Our Proven Cybersecurity Services',
    date: at(3, 7, 40),
    body: `Hello,

Small businesses are now the primary target for ransomware groups. Our managed security service includes 24/7 monitoring, endpoint protection and quarterly penetration tests.

I would love to schedule a 15 minute call to walk you through a free security assessment for MEC.

Regards,
Anjali Bansiwal`,
  }),
  msg({
    from: { name: 'Postmaster', email: 'postmaster@mec.example' },
    subject: 'Delivery Processing Failed: Deactivation Process',
    date: at(3, 6, 15),
    body: `This is an automatically generated delivery status notification.

Delivery to the following recipient failed permanently:

  ops@oldvendor.example

Technical details: 550 5.1.1 The email account that you tried to reach does not exist.

No further attempts will be made.`,
  }),
]
}

const senders = [
  ['Vercel', 'notifications@vercel.example', 'Deployment ready for mec-web', 'Your latest deployment to production finished in 42 seconds. Preview the build and check the runtime logs from the dashboard.'],
  ['GitHub', 'noreply@github.example', '[myselfRaifMondal/MEC] New pull request opened', 'A pull request was opened on the repository. Review the changes, leave comments or approve it from the pull request page.'],
  ['Stripe', 'receipts@stripe.example', 'Your receipt from Hostinger', 'Thanks for your payment. This email confirms a successful charge for your Business Email plan. A PDF receipt is attached for your records.'],
  ['Notion', 'team@notion.example', 'Weekly digest: 14 updates in MEC workspace', 'Here is what changed in your workspace this week. Three pages were edited, two databases were updated and one comment mentions you.'],
  ['Figma', 'updates@figma.example', 'Priya commented on Onboarding flow v3', 'Priya left a comment: "Can we make the empty state a bit friendlier? The icon feels too heavy." Reply directly from the file.'],
  ['Linear', 'notifications@linear.example', 'MEC-142 was assigned to you', 'Issue MEC-142 "Search results should highlight matches" was assigned to you by Dev Sharma. Due date is the end of this sprint.'],
  ['Slack', 'feedback@slack.example', 'You have 6 unread messages in #general', 'Catch up on conversations you missed while you were away. Highlights from #general, #product and #random are included below.'],
  ['Hostinger', 'noreply@hostinger.example', 'Your domain renews in 30 days', 'Automatic renewal is enabled for mec.example. No action is required, but you can review the invoice estimate in hPanel.'],
  ['Google Cloud', 'billing@cloud.example', 'Billing alert: 80% of budget reached', 'Your project has spent 80% of the monthly budget. Consider reviewing Compute Engine usage before the end of the billing period.'],
  ['Product Hunt', 'digest@producthunt.example', 'Today\'s top launches', 'Five products launched today that our community loved, including an AI meeting assistant and a keyboard-driven mail client.'],
  ['Y Combinator', 'apply@ycombinator.example', 'Applications for the next batch are open', 'The application takes about an hour. We look for clear thinking, a small team that moves quickly and evidence that users want what you build.'],
  ['Dev Sharma', 'dev@mec.example', 'Re: Sprint planning notes', 'Adding the notes from this morning. We agreed to ship the compose window first and move the contacts page to next sprint.'],
  ['Priya Nair', 'priya@mec.example', 'Design review tomorrow at 11', 'Sending over the updated prototypes ahead of tomorrow. Please look at the message list density options before we meet.'],
  ['Aarav Mehta', 'aarav@northstar.example', 'Partnership follow up', 'Great to meet you last week. As discussed, attaching the draft partnership outline. Let me know when you have time to review it together.'],
  ['LinkedIn', 'messages@linkedin.example', 'You appeared in 23 searches this week', 'People from Google, Zomato and Razorpay looked at your profile. Update your headline to appear in more searches.'],
  ['Medium Daily Digest', 'digest@medium.example', 'Stories for Raif: building an email client from scratch', 'Today\'s highlights include an essay on why IMAP is harder than it looks and a case study on inbox zero at a 40 person startup.'],
  ['AWS', 'no-reply@aws.example', 'Free tier usage alert for EC2', 'You have used 85% of the free tier hours for Amazon EC2 this month. Charges may apply if usage exceeds the limit.'],
  ['Calendly', 'notifications@calendly.example', 'New event: Intro call with Meera Iyer', 'A new event has been scheduled. Meera Iyer booked a 30 minute intro call. The invitation has been added to your calendar.'],
  ['Substack', 'no-reply@substack.example', 'Lenny\'s Newsletter: How the best PMs write', 'This week: the memo format used at Amazon, why clarity beats cleverness, and templates you can copy today.'],
  ['Razorpay', 'alerts@razorpay.example', 'Settlement of ₹42,300 processed', 'Your settlement has been transferred to the linked bank account. The detailed statement is available in the dashboard.'],
] as const

function generated(): Message[] {
  const out: Message[] = []
  const total = 109
  for (let i = 0; i < total; i++) {
    const s = senders[i % senders.length]
    const daysAgo = 4 + Math.floor(i / 3)
    const hour = 6 + ((i * 7) % 13)
    const minute = (i * 17) % 60
    const withAttachment = s[0] === 'Stripe' || s[0] === 'Aarav Mehta'
    out.push(
      msg({
        from: { name: s[0], email: s[1] },
        subject: s[2],
        date: at(daysAgo, hour, minute),
        read: i % 7 !== 6,
        starred: i % 11 === 0,
        hasCalendarInvite: s[0] === 'Calendly',
        attachments: withAttachment
          ? [attach(s[0] === 'Stripe' ? 'receipt.pdf' : 'Partnership-outline.docx', s[0] === 'Stripe' ? 96 * 1024 : 1.1 * MB, s[0] === 'Stripe' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')]
          : [],
        body: `${s[3]}

This message was generated for the demo inbox so that the list has enough mail to page through. Every action in the client (reading, starring, moving, replying) works on it just like real mail.

— ${s[0]}`,
      }),
    )
  }
  return out
}

function other(): Message[] {
  return [
  msg({
    folder: 'sent',
    from: ME,
    to: [{ name: 'Dev Sharma', email: 'dev@mec.example' }],
    subject: 'Sprint planning notes',
    date: at(4, 12, 10),
    read: true,
    body: `Hi Dev,

Here are the priorities for the sprint:

1. Compose window with reply and forward
2. Bulk actions in the message list
3. Contacts page

Let me know if anything is missing.

Raif`,
  }),
  msg({
    folder: 'sent',
    from: ME,
    to: [{ name: 'Aarav Mehta', email: 'aarav@northstar.example' }],
    cc: [{ name: 'Priya Nair', email: 'priya@mec.example' }],
    subject: 'Re: Partnership follow up',
    date: at(6, 18, 40),
    read: true,
    body: `Thanks Aarav, the outline looks good. I have looped in Priya who leads product on our side. Can we do Thursday afternoon?

Raif`,
  }),
  msg({
    folder: 'drafts',
    from: ME,
    to: [{ name: 'IIT Bombay', email: 'eureka@ecell.iitb.example' }],
    subject: 'Re: Eureka! 2026 | Quarter Finals',
    date: at(1, 20, 5),
    read: true,
    body: `Hello,

Thank you for the update. We will submit the deck before the deadline. One question about the mentoring session:`,
  }),
  msg({
    folder: 'scheduled',
    from: ME,
    to: [{ name: 'Priya Nair', email: 'priya@mec.example' }],
    subject: 'Reminder: design review',
    date: at(0, 8, 0),
    scheduledFor: at(-1, 9, 0),
    read: true,
    body: `Quick reminder that the design review starts at 11. Prototypes are in the shared Figma file.`,
  }),
  msg({
    folder: 'spam',
    from: { name: 'Rewards Center', email: 'win@prizes.example' },
    subject: 'You have been selected for a $1000 gift card',
    date: at(2, 3, 33),
    body: `Congratulations! Confirm your details to claim the reward. This offer expires in 24 hours.`,
  }),
  msg({
    folder: 'spam',
    from: { name: 'Crypto Signals', email: 'alerts@signals.example' },
    subject: '10x returns guaranteed this week',
    date: at(5, 1, 12),
    read: true,
    body: `Our members made 10x last week. Join the private group before spots run out.`,
  }),
  msg({
    folder: 'trash',
    previousFolder: 'inbox',
    from: { name: 'Zoom', email: 'no-reply@zoom.example' },
    subject: 'Cloud recording is ready: Weekly sync',
    date: at(8, 13, 0),
    read: true,
    body: `Your cloud recording is now available. Recordings are kept for 30 days.`,
  }),
]
}

const contacts: Contact[] = [
  { id: 'c1', name: 'Dev Sharma', email: 'dev@mec.example', company: 'MEC', phone: '+91 98765 11111', favorite: true },
  { id: 'c2', name: 'Priya Nair', email: 'priya@mec.example', company: 'MEC', phone: '+91 98765 22222', favorite: true },
  { id: 'c3', name: 'Aarav Mehta', email: 'aarav@northstar.example', company: 'Northstar Ventures', favorite: false },
  { id: 'c4', name: 'Sana Yaqoob', email: 'sana@firstwings.example', company: 'FIRSTWINGS', favorite: false },
  { id: 'c5', name: 'Meera Iyer', email: 'meera@growthlabs.example', company: 'Growth Labs', favorite: false },
  { id: 'c6', name: 'Anjali Bansiwal', email: 'anjali@securedge.example', company: 'SecurEdge', favorite: false },
]

const settings: Settings = {
  displayName: ME.name,
  email: ME.email,
  signature: 'Raif Mondal\nFounder, MEC',
  readingPane: 'right',
  density: 'comfortable',
  pageSize: 10,
  markReadOnOpen: true,
  showSnippets: false,
}

const setupSteps: SetupStep[] = [
  { id: 'verify', label: 'Verify your email address', done: true },
  { id: 'signature', label: 'Add an email signature', done: true },
  { id: 'mobile', label: 'Set up mail on your phone', done: true },
  { id: 'import', label: 'Import contacts', done: true },
  { id: 'folders', label: 'Create your first folder', done: true },
  { id: 'filters', label: 'Set up a filter rule', done: false },
  { id: 'alias', label: 'Add an alias address', done: false },
]

export function createSeedState(): AppState {
  counter = 0
  return {
    messages: [bcrecNotice(), ...featured(), ...generated(), ...other()],
    customFolders: [{ id: 'f_receipts', name: 'Receipts' }],
    contacts,
    settings,
    setupSteps,
    storageUsedBytes: Math.round(380.71 * MB),
    storageQuotaBytes: 10 * 1024 * MB,
  }
}
