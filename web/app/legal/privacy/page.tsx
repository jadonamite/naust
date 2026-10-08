import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Privacy policy · Naust' }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="7 October 2026">
      <p>Short version: this site doesn&rsquo;t ask for your details, doesn&rsquo;t track you and doesn&rsquo;t sell anything about you.</p>

      <h2>What we collect</h2>
      <p>
        Nothing you type in, because there&rsquo;s nothing to type in: no sign-up, no forms, no newsletter. There are no
        analytics, no advertising tags and no session recording on any page.
      </p>

      <h2>What your browser stores</h2>
      <p>
        One entry in your browser&rsquo;s local storage, <code>naust-cookie-notice</code>, which remembers that you closed
        the cookie notice. It never leaves your device. The <Link href="/legal/cookies">cookie policy</Link> has the
        detail.
      </p>

      <h2>Fonts and third parties</h2>
      <p>
        Fonts are served from this site itself, so loading a page doesn&rsquo;t send your IP address to Google or any
        other font host. The only outside links are to the Canton forum and the HackCanton event page, and they open only
        when you click them.
      </p>

      <h2>Server logs</h2>
      <p>
        Like any website, the server that hosts this one may record standard request details (IP address, time, page
        requested) for security and to keep it running. We don&rsquo;t use them to identify or profile visitors.
      </p>

      <h2>Demo data</h2>
      <p>
        The customers and deposits in the demo screens are test entries on Canton DevNet, made by us. They aren&rsquo;t
        real people or real money.
      </p>

      <h2>Your rights</h2>
      <p>
        If you think we hold anything about you and want to see it or have it deleted, ask through{' '}
        <a href="https://github.com/jadonamite">jadonamite on GitHub</a> and we&rsquo;ll answer.
      </p>
    </LegalPage>
  )
}
