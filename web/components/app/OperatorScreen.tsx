'use client'

import Link from 'next/link'
import type { CustomerView, DepositView } from '@/lib/views.ts'
import { CopyButton } from './CopyButton'
import { StatePill } from './StatePill'
import { amount, clock, short, usePoll } from './usePoll'
import styles from './app.module.css'

export type Treasury = { party: string; label: string; balance: string }
type Slot<T> = { data?: T; error?: string; loading: boolean }

export function OperatorScreen() {
  const treasury = usePoll<Treasury>('/api/ui/treasury', 3000)
  const customers = usePoll<CustomerView[]>('/api/ui/customers')
  const deposits = usePoll<DepositView[]>('/api/ui/deposits')
  return <OperatorView treasury={treasury} customers={customers} deposits={deposits} />
}

// The screen itself, separate from fetching, so the landing page can render it from a fixed snapshot.
export function OperatorView({
  treasury,
  customers,
  deposits,
  demoNote = true,
}: {
  treasury: Slot<Treasury>
  customers: Slot<CustomerView[]>
  deposits: Slot<DepositView[]>
  demoNote?: boolean
}) {
  const swept = deposits.data?.filter((d) => d.state === 'swept').length ?? 0
  const inFlight = deposits.data?.filter((d) => d.state !== 'swept' && d.state !== 'failed').length ?? 0
  const offline = treasury.error && customers.error && deposits.error

  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={`serif ${styles.title}`}>Deposits</h1>
          <p className={styles.subtitle}>Live from the ledger. Updates every 2 seconds.</p>
        </div>
      </div>

      {demoNote && (
        <p className={styles.note}>
          Customer addresses here come from a pool on the shared DevNet node, so their fingerprint is the node&rsquo;s.
          On your own node they sit under your business&rsquo;s key.
        </p>
      )}

      {offline && (
        <p role="status" className={styles.alert}>
          Can&rsquo;t reach the ledger right now. Retrying every few seconds.
        </p>
      )}

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.stat}>
          <p className={styles.statLabel}>Treasury balance</p>
          <p className={`serif ${styles.statValue}`}>
            {treasury.data ? `${amount(treasury.data.balance)} CC` : treasury.loading ? '…' : 'Unavailable'}
          </p>
          {treasury.data && <p className={styles.statFoot}>{short(treasury.data.label, 18)}</p>}
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Deposits matched</p>
          <p className={`serif ${styles.statValue}`}>{deposits.data ? swept : '…'}</p>
          <p className={styles.statFoot}>{inFlight ? `${inFlight} in progress` : 'None in progress'}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Customers</p>
          <p className={`serif ${styles.statValue}`}>{customers.data?.length ?? '…'}</p>
          <p className={styles.statFoot}>One address each</p>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="customers-title">
        <h2 id="customers-title" className={styles.cardTitle}>
          Customers
        </h2>
        {customers.data && customers.data.length === 0 ? (
          <p className={styles.empty}>No customers yet. Run <code>npm run seed -- Ada</code> to create the first one.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Deposit address</th>
                  <th scope="col" className={styles.num}>
                    Deposits
                  </th>
                  <th scope="col" className={styles.num}>
                    Received
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.data?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customer/${encodeURIComponent(c.ref)}`} className={styles.rowLink}>
                        {c.ref}
                      </Link>
                    </td>
                    <td>
                      <span className={styles.address}>
                        <code title={c.address}>{short(c.address, 16)}</code>
                        <CopyButton value={c.address} label={`Copy ${c.ref}'s deposit address`} />
                      </span>
                    </td>
                    <td className={styles.num}>{c.deposits}</td>
                    <td className={styles.num}>{amount(c.received)} CC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="deposits-title">
        <h2 id="deposits-title" className={styles.cardTitle}>
          Latest deposits
        </h2>
        {deposits.data && deposits.data.length === 0 ? (
          <p className={styles.empty}>
            No deposits yet. Send Canton Coin to any address above and it appears here within seconds.
          </p>
        ) : (
          <ol className={styles.feed} aria-live="polite">
            {deposits.data?.slice(0, 12).map((d) => (
              <li key={d.id} className={styles.feedRow}>
                <span className={styles.feedTime}>{clock(d.seenAt)}</span>
                <span className={styles.feedMain}>
                  <strong>{amount(d.amount)} CC</strong> for <strong>{d.customerRef}</strong>
                  <span className={styles.feedFrom}>from {short(d.senderLabel, 18)}, no memo</span>
                </span>
                <StatePill state={d.state} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
