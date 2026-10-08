import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Link from 'next/link'
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CaretDown,
  ChartLineUp,
  CreditCard,
  EyeSlash,
  PaperPlaneTilt,
  Vault,
  Wallet,
} from '@phosphor-icons/react/dist/ssr'
import styles from './landing.module.css'

const has = (p: string) => existsSync(join(/*turbopackIgnore: true*/ process.cwd(), 'public', p))
export function Statement() {
  return (
    <section id="how" className={styles.statement}>
      <p>
        Your customers send from any exchange or wallet. Naust knows who paid, credits them and moves the money to
        your treasury before anyone opens a ticket.
      </p>
    </section>
  )
}

export function LiveMatching() {
  return (
    <section className={styles.wrap}>
      <div className={styles.duskPanel}>
        <div className={styles.panelCopy}>
          <p className="eyebrow">Live matching</p>
          <div className={styles.panelBottom}>
            <h2 className={`serif ${styles.panelTitle} ${styles.duskInk}`}>Know whose money it is the moment it lands</h2>
            <p className={`${styles.panelLead} ${styles.duskInk2}`}>
              Every customer pays into their own address, so every deposit arrives already labelled. Naust credits
              the right person in seconds. No memo to forget, no sender to look up.
            </p>
          </div>
        </div>

        <div className={styles.appWindow}>
          <div className={styles.windowBar}>
            <span className={styles.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Deposit trace
          </div>
          <div className={styles.windowBody}>
            <div className={styles.traceHead}>
              <p className={styles.traceLabel}>
                Matched to <strong>Ada</strong>
              </p>
              <p className={`serif ${styles.traceAmount}`}>1.5 CC</p>
              <p className={styles.traceMeta}>No memo. Sent to 86bb3d93-Ada</p>
            </div>
            <ol className={styles.steps}>
              <li>
                <span>Seen on Ada&rsquo;s address</span>
                <span>2.2 s</span>
              </li>
              <li>
                <span>Accepted as Ada</span>
                <span>done</span>
              </li>
              <li>
                <span>Receipt written to the ledger</span>
                <span>done</span>
              </li>
              <li>
                <span>Swept to treasury</span>
                <span>31.5 s</span>
              </li>
            </ol>
          </div>
          <ul className={styles.badges}>
            <li>Credited in seconds</li>
            <li>No memo needed</li>
            <li>Any wallet can send</li>
            <li>A receipt for every deposit</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export function TwoCards() {
  const cards = [
    {
      art: 'illustrations/addresses',
      title: 'One address per customer',
      body: 'Hand it out like an account number. Any wallet or exchange on Canton can pay into it, and every payment is theirs.',
    },
    {
      art: 'illustrations/sweep',
      title: 'Swept home, receipted',
      body: 'Every deposit lands in your treasury on its own, with a receipt that only you and that customer can see.',
    },
  ]
  return (
    <section className={`${styles.wrap} ${styles.twoCards}`}>
      {cards.map((c) => {
        const src = has(`${c.art}.svg`) ? `/${c.art}.svg` : has(`${c.art}.png`) ? `/${c.art}.png` : null
        return (
          <article key={c.title} className={styles.artCard}>
            <div className={styles.art} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated illustration */}
              {src && <img src={src} alt="" />}
            </div>
            <h3 className={`serif ${styles.cardTitle}`}>{c.title}</h3>
            <p className={styles.cardBody}>{c.body}</p>
          </article>
        )
      })}
    </section>
  )
}

export function WhyItHolds() {
  const cards = [
    {
      icon: PaperPlaneTilt,
      title: 'Nothing changes for the sender',
      body: 'Customers pay the way they already do, from any exchange or wallet. Nothing to install, nothing to type.',
    },
    {
      icon: ArrowsClockwise,
      title: 'Counted exactly once',
      body: 'Each deposit is credited once and only once. No double credits, no missing ones, no spreadsheet to reconcile.',
    },
    {
      icon: EyeSlash,
      title: 'Private to each customer',
      body: 'Each customer sees their own deposits and nobody else’s. Their history is theirs alone.',
    },
    {
      icon: Vault,
      title: 'Your treasury, automatically',
      body: 'Money never waits on a customer address. It moves to your treasury on its own, down to the last unit.',
    },
  ]
  return (
    <section className={styles.hall}>
      <div className={styles.hallCopy}>
        <p className="eyebrow">Why operators switch</p>
        <h2 className={`serif ${styles.hallTitle}`}>
          Every deposit <em>credited</em>, none of them <em>lost</em>
        </h2>
        <p className={styles.hallLead}>
          No lost deposits, no recovery tickets, no one waiting on support to find their money.
        </p>
        <Link href="/operator" className="btn btn-ink">
          Open the demo
        </Link>
      </div>
      <ol className={styles.stack}>
        {cards.map((c, i) => (
          <li key={c.title} className={styles.stackCard} style={{ top: `calc(7rem + ${i} * 1.875rem)` }}>
            <span className={styles.iconBlob} aria-hidden="true">
              <c.icon size={24} weight="regular" />
            </span>
            <h3 className={`serif ${styles.cardTitle}`}>{c.title}</h3>
            <p className={styles.cardBody}>{c.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Ledger() {
  return (
    <section id="ledger" className={styles.wrap}>
      <div className={styles.rustPanel}>
        <div className={styles.panelCopy}>
          <p className="eyebrow">Receipts</p>
          <div className={styles.panelBottom}>
            <h2 className={`serif ${styles.panelTitle} ${styles.rustInk}`}>A receipt for every deposit</h2>
            <p className={`${styles.panelLead} ${styles.rustInk2}`}>
              Who paid, how much and when, written down the moment it lands. Your customers see their own history,
              and so do you.
            </p>
          </div>
        </div>
        <div className={styles.docs} aria-label="A deposit receipt for Ada">
          <article className={`${styles.doc} ${styles.docBack}`}>
            <div className={styles.docBar} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <h3 className={styles.docTitle}>Customer account</h3>
            <dl className={styles.docFields}>
              <dt>Customer</dt>
              <dd>Ada</dd>
              <dt>Address</dt>
              <dd>86bb3d93-Ada</dd>
              <dt>Pays from</dt>
              <dd>Any wallet</dd>
            </dl>
          </article>
          <article className={`${styles.doc} ${styles.docFront}`}>
            <div className={styles.docBar} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <h3 className={styles.docTitle}>Deposit receipt</h3>
            <dl className={styles.docFields}>
              <dt>Customer</dt>
              <dd>Ada</dd>
              <dt>Amount</dt>
              <dd>1.5 CC</dd>
              <dt>Received</dt>
              <dd>6 Oct 2026, 14:36 UTC</dd>
              <dt>Credited</dt>
              <dd>2.2 seconds after it landed</dd>
              <dt>Treasury</dt>
              <dd>Swept</dd>
            </dl>
            <p className={styles.docFoot}>Only you and Ada can see this</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function Precedent() {
  const addresses = ['ada', 'ben', 'tokunbo', 'amara', 'lucas', 'mei', 'ifeoma', 'sven', 'priya', 'jonas']
  const row = addresses.map((a) => `${a}::1220…`)
  return (
    <section className={styles.precedent}>
      <p className="eyebrow">Customer addresses</p>
      <h2 className={`serif ${styles.precedentTitle}`}>An address for every customer you have</h2>
      <p className={styles.precedentLead}>
        Open one the moment someone signs up. Ten customers or ten thousand, every one of them pays into an address
        with their name on it.
      </p>
      <div className={styles.marquee} aria-hidden="true">
        <ul className={styles.marqueeTrack}>
          {[...row, ...row].map((a, i) => (
            <li key={i} className={styles.chip}>
              <span className={styles.chipMark} />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Quotes() {
  const quotes = [
    {
      text: 'A memo solves that on paper, but in practice users forget to fill it in, and every miss becomes a support case to recover funds.',
      who: 'joao_trakx',
      where: 'Trakx, Canton forum',
      fix: 'Nothing to fill in. The address is the memo.',
    },
    {
      text: 'An investor whose tokens sit on an exchange sends from an omnibus party that identifies nobody and can change at any time.',
      who: 'joao_trakx',
      where: 'Trakx, Canton forum',
      fix: 'It no longer matters who sends. Where it lands says whose it is.',
    },
    {
      text: 'You could do something clever where you allocate a fixed N number of deposit addresses and you can rotate through them with time allocation per user.',
      who: 'kevmuko',
      where: 'Walley wallet, Canton forum',
      fix: 'No rotation schemes to build. Every customer has an address of their own.',
    },
  ]
  return (
    <section className={styles.quotes}>
      <div className={styles.dashes} aria-hidden="true" />
      <p className="eyebrow">What it ends</p>
      <h2 className={`serif ${styles.precedentTitle}`}>The deposit problems Canton teams talk about</h2>
      <p className={styles.precedentLead}>Operators described them on the Canton forum. Here is each one with Naust.</p>
      <ul className={styles.quoteRow}>
        {quotes.map((q) => (
          <li key={q.text} className={styles.quoteCard}>
            <blockquote className={`serif ${styles.quoteText}`}>{q.text}</blockquote>
            <div>
              <p className={styles.quoteWho}>
                <strong>{q.who}</strong>
                <span>{q.where}</span>
              </p>
              <p className={styles.quoteFix}>
                <strong>With Naust.</strong> {q.fix}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Builders() {
  const cards = [
    { icon: ArrowsLeftRight, title: 'Exchanges', body: 'Credit every incoming deposit to the right account, even when it comes from another exchange.' },
    { icon: Wallet, title: 'Wallets', body: 'Give every user a receiving address that is theirs from the first day.' },
    { icon: CreditCard, title: 'Payment apps', body: 'Know which customer paid the moment the money arrives, with no reference to type.' },
    { icon: ChartLineUp, title: 'Fund platforms', body: 'Take subscriptions from investors wherever their tokens are held.' },
  ]
  return (
    <section id="builders" className={styles.wrapNarrow}>
      <div className={styles.darkPanel}>
        <div className={styles.darkCopy}>
          <p className={`eyebrow ${styles.onDark}`}>Who it&rsquo;s for</p>
          <div>
            <h2 className={`serif ${styles.darkTitle}`}>Every Canton business that takes deposits</h2>
            <p className={styles.darkLead}>If customers send you money on Canton, Naust tells you whose it is.</p>
          </div>
        </div>
        <ul className={styles.blackGrid}>
          {cards.map((c) => (
            <li key={c.title} className={styles.blackCard}>
              <span className={styles.blackIcon} aria-hidden="true">
                <c.icon size={26} weight="regular" />
              </span>
              <div>
                <h3 className={`serif ${styles.blackTitle}`}>{c.title}</h3>
                <p className={styles.blackBody}>{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Faq() {
  const items = [
    {
      q: 'Does the sender have to change anything?',
      a: 'No. They send an ordinary Canton transfer to the customer’s address. No memo, no registration, no new wallet.',
    },
    {
      q: 'Who controls the customer addresses?',
      a: 'You do. Every address belongs to your business, so one key covers all of them.',
    },
    {
      q: 'Can one customer see another’s deposits?',
      a: 'No. Each customer sees their own deposits and nothing else. You see all of them.',
    },
    {
      q: 'Which tokens does it handle?',
      a: 'Canton Coin, and any token built on the Canton token standard.',
    },
  ]
  return (
    <section id="faq" className={styles.faq}>
      <div className={styles.faqCopy}>
        <p className="eyebrow">FAQ</p>
        <h2 className={`serif ${styles.faqTitle}`}>Questions operators ask first</h2>
        <p className={styles.faqLead}>Keys, privacy, tokens, and what the sender has to do.</p>
        <Link href="/operator" className="btn btn-ink btn-sm">
          Open the demo
        </Link>
      </div>
      <div className={styles.faqList}>
        {items.map((it) => (
          <details key={it.q} className={styles.faqItem}>
            <summary>
              <span className="serif">{it.q}</span>
              <CaretDown size={16} weight="bold" aria-hidden="true" className={styles.caret} />
            </summary>
            <p>{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Cta() {
  const texture = has('textures/paper.jpg')
  return (
    <section className={styles.wrapNarrow}>
      <div className={styles.cta} style={texture ? { backgroundImage: 'url(/textures/paper.jpg)' } : undefined}>
        <p className="eyebrow">Get started</p>
        <h2 className={`serif ${styles.ctaTitle}`}>Stop matching deposits by hand</h2>
        <p className={styles.ctaLead}>Send a deposit and watch it find its customer and reach your treasury, live.</p>
        <div className={styles.ctaActions}>
          <Link href="/operator" className="btn btn-accent">
            Open the demo
          </Link>
          <Link href="/customer/Ada" className="btn btn-paper">
            See a customer view
          </Link>
        </div>
      </div>
    </section>
  )
}
