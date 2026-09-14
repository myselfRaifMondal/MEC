/**
 * Rich HTML bodies for the seeded newsletters and notices. Real mail arrives as HTML with inline
 * styles, so these follow that convention. Only seed data ever carries HTML; user mail stays plain text.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Newsletter {
  brand: string
  color: string
  logo?: string
  preheader?: string
  title: string
  paragraphs: string[]
  cta?: { label: string; href?: string }
  details?: [string, string][]
  footer?: string
  address?: string
}

export function newsletter(n: Newsletter): string {
  const logo = n.logo
    ? `<img src="${n.logo}" alt="" width="36" height="36" style="width:36px;height:36px;border-radius:8px;vertical-align:middle;margin-right:10px;background:#fff;padding:3px;box-sizing:border-box" />`
    : ''
  const details = n.details
    ? `<table style="width:100%;margin:8px 0 20px;border:1px solid #e6e6ee;border-radius:8px;font-size:14px">${n.details
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 14px;color:#6b6f80;border-bottom:1px solid #eeeef3;width:120px">${esc(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #eeeef3;font-weight:600">${esc(v)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
  const cta = n.cta
    ? `<p style="margin:26px 0 8px"><a href="${n.cta.href ?? '#'}" onclick="return false" style="display:inline-block;background:${n.color};color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:8px;font-size:15px">${esc(n.cta.label)}</a></p>`
    : ''
  return `
<div style="max-width:680px;margin:0 auto;background:#ffffff">
  ${n.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${esc(n.preheader)}</div>` : ''}
  <div style="background:${n.color};padding:18px 32px;color:#fff;font-weight:800;font-size:18px;letter-spacing:.02em">${logo}${esc(n.brand)}</div>
  <div style="padding:34px 32px 26px;color:#1f2330">
    <h1 style="font-size:24px;line-height:1.3;margin:0 0 18px;font-weight:800">${esc(n.title)}</h1>
    ${n.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65">${p}</p>`).join('')}
    ${details}
    ${cta}
  </div>
  <div style="padding:18px 32px 26px;border-top:1px solid #ececf2;color:#8a8e9c;font-size:12px;line-height:1.6">
    ${n.footer ? `<p style="margin:0 0 8px">${n.footer}</p>` : ''}
    ${n.address ? `<p style="margin:0 0 8px">${esc(n.address)}</p>` : ''}
    <p style="margin:0"><a href="#" onclick="return false" style="color:#8a8e9c">Unsubscribe</a> · <a href="#" onclick="return false" style="color:#8a8e9c">Manage preferences</a> · <a href="#" onclick="return false" style="color:#8a8e9c">View in browser</a></p>
  </div>
</div>`
}

export const BCREC_HTML = `
<div style="max-width:720px;margin:0 auto;background:#ffffff;color:#1f2330;padding:36px 44px 30px">
  <table style="width:100%;border-bottom:3px double #cc1f2c;padding-bottom:14px;margin-bottom:18px"><tr>
    <td style="width:84px;vertical-align:middle"><img src="/logos/bcrec.svg" alt="BCREC crest" width="76" style="width:76px;display:block" /></td>
    <td style="vertical-align:middle;text-align:center">
      <div style="font-size:21px;font-weight:800;color:#cc1f2c;letter-spacing:.02em">Dr. B. C. Roy Engineering College</div>
      <div style="font-size:13px;color:#4b4f5e;margin-top:3px">Jemua Road, Fuljhore, Durgapur – 713206, West Bengal · Approved by AICTE, Affiliated to MAKAUT</div>
      <div style="font-size:12px;color:#4b4f5e;margin-top:2px">www.bcrec.ac.in · info@bcrec.ac.in · +91 343 250 1353</div>
    </td>
  </tr></table>
  <table style="width:100%;font-size:14px;margin-bottom:22px"><tr>
    <td><b>Ref. No.:</b> BCREC/PR/2026-27/1</td>
    <td style="text-align:right"><b>Date:</b> 13.09.2026</td>
  </tr></table>
  <h2 style="text-align:center;font-size:20px;letter-spacing:.18em;margin:0 0 16px;text-decoration:underline">NOTICE</h2>
  <p style="margin:0 0 16px;font-size:15px"><b>Subject: Press Meet for the Felicitation of IndiQuant</b></p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;text-align:justify">This is to notify all concerned that Dr. B. C. Roy Engineering College, Durgapur, will be hosting a Press Meet on <b>Wednesday, 16th September, 2026 at 11:00 A.M.</b> in the <b>Albert Einstein Hall, BCREC campus</b>, on the occasion of the Felicitation of IndiQuant.</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;text-align:justify">Representatives of IndiQuant are cordially invited to be present on the occasion. Members of the press and media are being invited to cover the event, and a list of media houses proposed to be invited is enclosed below for reference and confirmation.</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.7;text-align:justify">All concerned departments/committees (Media &amp; Public Relations Cell, Administration, Security, and Hospitality) are requested to extend the necessary cooperation for the smooth conduct of the programme.</p>
  <h3 style="font-size:15px;margin:0 0 10px">Media Houses Proposed to be Invited</h3>
  <table style="width:100%;font-size:14px;line-height:1.7;margin-bottom:26px"><tr>
    <td style="vertical-align:top;width:50%"><b>A. Regional Media (West Bengal)</b><ul style="margin:6px 0 0;padding-left:20px"><li>Anandabazar Patrika</li><li>Bartaman Patrika</li><li>Sangbad Pratidin</li><li>Ei Samay</li><li>ABP Ananda (TV)</li><li>Zee 24 Ghanta (TV)</li><li>News18 Bangla (TV)</li></ul></td>
    <td style="vertical-align:top;width:50%"><b>B. National Media</b><ul style="margin:6px 0 0;padding-left:20px"><li>The Telegraph</li><li>The Times of India</li><li>Hindustan Times</li><li>Press Trust of India (PTI)</li></ul></td>
  </tr></table>
  <table style="width:100%;font-size:14px"><tr>
    <td style="vertical-align:bottom">Enclosure: Notice (PDF)<br />Copy to: Principal's Office, Media &amp; PR Cell, Administration, Security, Hospitality</td>
    <td style="text-align:right;vertical-align:bottom"><div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:26px;color:#1f2330;margin-bottom:2px">S. Chatterjee</div><b>General Secretary</b><br />Dr. B. C. Roy Engineering College, Durgapur</td>
  </tr></table>
</div>`

export const POSTMASTER_HTML = `
<div style="max-width:680px;margin:0 auto;background:#ffffff;color:#1f2330;padding:28px 32px">
  <p style="margin:0 0 14px;font-size:15px"><b>Delivery has failed to these recipients or groups:</b></p>
  <p style="margin:0 0 18px;font-size:15px"><a href="mailto:ops@oldvendor.example" style="color:#673de6">ops@oldvendor.example</a><br />The email address you entered couldn't be found. Please check the recipient's email address and try to resend the message. If the problem continues, please contact your helpdesk.</p>
  <div style="background:#f5f5f8;border:1px solid #e3e3ea;border-radius:8px;padding:14px 16px;font-family:Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;color:#374151;white-space:pre-wrap">Reporting-MTA: dns; mx1.mec.example
Arrival-Date: Fri, 11 Sep 2026 06:15:02 +0530

Final-Recipient: rfc822; ops@oldvendor.example
Action: failed
Status: 5.1.1
Diagnostic-Code: smtp; 550 5.1.1 The email account that you tried to reach does not exist.
Remote-MTA: dns; mail.oldvendor.example</div>
  <p style="margin:18px 0 0;font-size:13px;color:#6b6f80">This is an automatically generated Delivery Status Notification. No further attempts will be made.</p>
</div>`
