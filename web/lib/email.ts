import { env } from './env.ts'

// Transactional email: sign-in codes and invites. Never used for marketing.
export type Email = { to: string; subject: string; text: string }

export async function sendEmail(email: Email): Promise<void> {
  if (!env.resendKey) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set, so email cannot be sent')
    console.log(`[email] to ${email.to}: ${email.subject}\n${email.text}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to: [email.to], subject: email.subject, text: email.text }),
  })
  if (!res.ok) throw new Error(`Resend refused the email: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
}
