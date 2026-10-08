import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Cookie policy · Naust' }

export default function Cookies() {
  return (
    <LegalPage title="Cookie policy" updated="7 October 2026">
      <p>Naust sets no cookies at all: none for tracking, none for advertising, and none for analytics.</p>

      <h2>The one thing we store</h2>
      <p>
        When you close the cookie notice, your browser saves one entry in local storage, called{' '}
        <code>naust-cookie-notice</code>, with the value <code>closed</code>. Its only job is to stop the notice coming
        back. It stays on your device, we never read it on a server, and it holds nothing about who you are.
      </p>

      <h2>Removing it</h2>
      <p>
        Clear this site&rsquo;s data in your browser settings and the entry is gone. The notice will show once more on
        your next visit.
      </p>

      <h2>If this changes</h2>
      <p>
        If we ever add anything that needs your consent, such as analytics, it will stay off until you agree to it, and
        this page will say exactly what it is.
      </p>
    </LegalPage>
  )
}
