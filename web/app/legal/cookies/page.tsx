import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Cookie policy · Naust' }

export default function Cookies() {
  return (
    <LegalPage title="Cookie policy" updated="10 October 2026">
      <p>
        Naust sets two cookies, and only once you start signing up or signing in. Both are needed for the site to work.
        None track you, none advertise, and none measure visits.
      </p>

      <h2>The cookies</h2>
      <ul>
        <li>
          <code>naust.session_token</code> keeps you signed in. It lasts 7 days, or until you sign out.
        </li>
        <li>
          <code>naust_age</code> remembers the result of the age check at sign-up, over or under the minimum age, for one
          year. It holds no birth date.
        </li>
      </ul>
      <p>Your browser&rsquo;s scripts can&rsquo;t read either of them, and both are sent only to this site.</p>

      <h2>Local storage</h2>
      <p>
        When you close the cookie notice, your browser saves <code>naust-cookie-notice</code> with the value{' '}
        <code>closed</code> so the notice doesn&rsquo;t come back. It stays on your device.
      </p>

      <h2>Removing them</h2>
      <p>
        Signing out removes the session cookie. Clearing this site&rsquo;s data in your browser removes everything.
      </p>

      <h2>If this changes</h2>
      <p>
        If we ever add anything that needs your consent, such as analytics, it stays off until you agree to it, and this
        page will say exactly what it is.
      </p>
    </LegalPage>
  )
}
