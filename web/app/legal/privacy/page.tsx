import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Privacy policy · Naust' }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="10 October 2026">
      <p>
        Short version: we keep your email address so you can sign in, and as little else as the service needs. No
        analytics, no advertising, no session recording, and nothing is sold. This policy hasn&rsquo;t been reviewed by a
        lawyer yet.
      </p>

      <h2>If you only read the site</h2>
      <p>
        Nothing you type is collected, because there&rsquo;s nothing to type. The public demo screens show test data on
        Canton DevNet, made by us. They aren&rsquo;t real people or real money.
      </p>

      <h2>If you create an account</h2>
      <p>We store:</p>
      <ul>
        <li>your email address, which is how you sign in;</li>
        <li>
          whether you passed the age check at sign-up. We ask for your date of birth and keep only the answer, over or
          under the minimum age. The date itself is never stored;
        </li>
        <li>
          each signed-in session: when it started, when it ends (7 days later unless you sign out), and the IP address and
          browser it came from, so a stolen session can be spotted;
        </li>
        <li>
          short-lived counters keyed by IP address that limit how many sign-in codes can be requested, to stop code
          guessing.
        </li>
      </ul>
      <p>
        If you run a business on Naust, we also store its name, who its members are, and the customers and deposits it
        creates. If a business invited you as a customer, we store the link between your account and your deposit address
        there.
      </p>

      <h2>What the ledger holds</h2>
      <p>
        Deposit receipts live on the Canton ledger, not only in our database. A receipt names the business, the
        customer&rsquo;s deposit address, the amount and the sender. The ledger shows it only to the business and that
        customer&rsquo;s address. Ledger records can&rsquo;t be deleted the way database rows can.
      </p>

      <h2>Who else handles it</h2>
      <p>
        Sign-in codes and invites are sent by email through Resend. The site runs on Vercel, and the database is Neon
        Postgres in the United States. Each processes data only to run this service. Fonts are served from this site
        itself, so loading a page doesn&rsquo;t send your IP address to a font host.
      </p>

      <h2>Cookies</h2>
      <p>
        Two cookies, both needed for the site to work: one keeps you signed in, the other remembers the result of the age
        check. The <Link href="/legal/cookies">cookie policy</Link> lists them.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see what we hold about you, or to have your account deleted. There&rsquo;s no button for this yet,
        so ask through <a href="https://github.com/jadonamite">jadonamite on GitHub</a> and we&rsquo;ll do it. Deleting
        an account removes it from our database; receipts already written to the ledger stay there.
      </p>
    </LegalPage>
  )
}
