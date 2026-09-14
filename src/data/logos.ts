/** Sender logos keyed by email domain. Anything not listed falls back to an initials avatar. */
const LOGO_BY_DOMAIN: Record<string, string> = {
  'bcrec.ac.in': '/logos/bcrec.svg',
  'nvidia.example': '/logos/nvidia.svg',
  'granola.example': '/logos/granola.svg',
  'getprospect.example': '/logos/getprospect.svg',
  'anthropic.example': '/logos/anthropic.svg',
  'ecell.iitb.example': '/logos/iitb.svg',
  'firstwings.example': '/logos/firstwings.svg',
  'buildwithai.example': '/logos/growthx.svg',
  'securedge.example': '/logos/securedge.svg',
  'vercel.example': '/logos/vercel.svg',
  'github.example': '/logos/github.svg',
  'stripe.example': '/logos/stripe.svg',
  'notion.example': '/logos/notion.svg',
  'figma.example': '/logos/figma.svg',
  'linear.example': '/logos/linear.svg',
  'slack.example': '/logos/slack.svg',
  'hostinger.example': '/logos/hostinger.svg',
  'cloud.example': '/logos/googlecloud.svg',
  'producthunt.example': '/logos/producthunt.svg',
  'ycombinator.example': '/logos/ycombinator.svg',
  'linkedin.example': '/logos/linkedin.svg',
  'medium.example': '/logos/medium.svg',
  'aws.example': '/logos/aws.svg',
  'calendly.example': '/logos/calendly.svg',
  'substack.example': '/logos/substack.svg',
  'razorpay.example': '/logos/razorpay.svg',
  'zoom.example': '/logos/zoom.svg',
  'prizes.example': '/logos/prizes.svg',
  'signals.example': '/logos/signals.svg',
}

/** Logos for specific mailboxes that share a domain with people (e.g. the postmaster). */
const LOGO_BY_ADDRESS: Record<string, string> = {
  'postmaster@mec.example': '/logos/postmaster.svg',
}

/** Logos with light artwork that need a white backdrop to read well in the dark theme. */
const LIGHT_BACKDROP = new Set(['/logos/bcrec.svg'])

export function logoFor(email: string | undefined): string | undefined {
  if (!email) return undefined
  const key = email.trim().toLowerCase()
  if (LOGO_BY_ADDRESS[key]) return LOGO_BY_ADDRESS[key]
  const domain = key.split('@')[1]
  return domain ? LOGO_BY_DOMAIN[domain] : undefined
}

export function logoNeedsLightBackdrop(src: string): boolean {
  return LIGHT_BACKDROP.has(src)
}
