import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Terms of service · Naust' }

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="7 October 2026">
      <p>
        Naust is a project built for HackCanton Season 3 by Jadon (jadonamite on GitHub). These terms cover this website
        and its demo screens.
      </p>

      <h2>What the demo is</h2>
      <p>
        The operator and customer screens run against Canton DevNet, a test network. Every amount shown is test Canton
        Coin with no monetary value. Nothing on this site moves real money, holds funds for you, or offers a financial
        service.
      </p>

      <h2>Using the site</h2>
      <p>
        You can read the site and use the demo screens freely. Please don&rsquo;t try to disrupt the demo, overload the
        test network through it, or get at parts of the system the screens don&rsquo;t expose.
      </p>

      <h2>No warranty</h2>
      <p>
        The site and the demo are provided as they are, without any promise that they&rsquo;re accurate, available or fit
        for a particular purpose. Test networks reset and change, so the demo can stop working at any time. Don&rsquo;t
        rely on anything here to run a real business.
      </p>

      <h2>Other people&rsquo;s words and marks</h2>
      <p>
        The quotes on the home page come from a public thread on the Canton forum and belong to their authors, who are
        named and linked. Quoting them doesn&rsquo;t mean they endorse Naust. Canton, Canton Coin and other names belong
        to their owners.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, the date at the top of this page changes with them.</p>

      <h2>Contact</h2>
      <p>
        Questions go to <a href="https://github.com/jadonamite">jadonamite on GitHub</a>.
      </p>
    </LegalPage>
  )
}
