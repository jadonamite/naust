'use client'

import Link from 'next/link'
import type { CustomerView, DepositView } from '@/lib/views.ts'
import { CopyButton } from './CopyButton'
import { ActionButton } from './ActionButton'
import { InviteButton } from './InviteButton'
import { StatePill } from './StatePill'
import { amount, clock, usePoll } from './usePoll'
import { partyName } from '@/lib/party.ts'
import styles from './app.module.css'

export type Treasury = { party: string; label: string; balance: string }
type Slot<T> = { data?: T; error?: string; loading: boolean }

// `/api/demo` is the public, read-only demo; `/api/app` is the signed-in operator's own business.
// `op` picks which public business the read-only screen shows.
export function OperatorScreen({ api = '/api/demo', title, op }: { api?: '/api/demo' | '/api/app'; title?: string; op?: string }) {
  const q = op ? `?op=${encodeURIComponent(op)}` : ''
  const treasury = usePoll<Treasury | null>(`${api}/treasury${q}`, 3000)
  const customers = usePoll<CustomerView[]>(`${api}/customers${q}`)
  const deposits = usePoll<DepositView[]>(`${api}/deposits${q}`)
  const manage = api === '/api/app'
  return (
    <OperatorView
      treasury={treasury}
      customers={customers}
      deposits={deposits}
      demoNote={!manage}
      manage={manage}
      title={title}
      op={op}
    />
  )
}

// The screen itself, separate from fetching, so the landing page can render it from a fixed snapshot.
export function OperatorView({
  treasury,
  customers,
  deposits,
  demoNote = true,
  manage = false,
  title = 'Deposits',
  op,
}: {
  treasury: Slot<Treasury | null>
  customers: Slot<CustomerView[]>
  deposits: Slot<DepositView[]>
  demoNote?: boolean
  manage?: boolean
  title?: string
  op?: string
}) {
  const swept = deposits.data?.filter((d) => d.state === 'swept').length ?? 0
  const inFlight = deposits.data?.filter((d) => d.state !== 'swept' && d.state !== 'failed').length ?? 0
  const offline = treasury.error && customers.error && deposits.error
  const unconnected = manage && treasury.data === null && !treasury.loading

  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={`serif ${styles.title}`}>{title}</h1>
          {!unconnected && <p className={styles.subtitle}>Live from the ledger. Updates every 2 seconds.</p>}
        </div>
      </div>

      {demoNote && (
        <p className={styles.note}>
          Customer addresses here come from a pool on the shared DevNet node, so their fingerprint is the node&rsquo;s.
          On your own node they sit under your business&rsquo;s key.
        </p>
      )}

      {unconnected && (
        <p className={styles.note}>
          Deposit addresses come from your Canton node. Once Naust can connect to it, you&rsquo;ll create customers
          here and each one gets an address of their own.
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
            {treasury.data ? `${amount(treasury.data.balance)} CC` : treasury.loading ? '…' : unconnected ? 'No node yet' : 'Unavailable'}
          </p>
          {treasury.data && <p className={styles.statFoot} title={treasury.data.party}>{treasury.data.label}</p>}
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
          <p className={styles.empty}>No customers yet.</p>
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
                  {manage && (
                    <th scope="col">
                      <span className="visually-hidden">Customer access</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.data?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {manage ? (
                        c.ref
                      ) : (
                        <Link href={`/customer/${encodeURIComponent(c.ref)}${op ? `?op=${encodeURIComponent(op)}` : ''}`} className={styles.rowLink}>
                          {c.ref}
                        </Link>
                      )}
                    </td>
                    <td>
                      <span className={styles.address}>
                        <code title={c.address}>{c.label ?? partyName(c.address)}</code>
                        <CopyButton value={c.address} label={`Copy ${c.ref}'s deposit address`} />
                      </span>
                    </td>
                    <td className={styles.num}>{c.deposits}</td>
                    <td className={styles.num}>{amount(c.received)} CC</td>
                    {manage && (
                      <td className={styles.rowAction}>
                        <InviteButton customerId={c.id} customerRef={c.ref} />
                      </td>
                    )}
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
            {unconnected
              ? 'No deposits yet.'
              : 'No deposits yet. Send Canton Coin to any address above and it appears here within seconds.'}
          </p>
        ) : (
          <ol className={styles.feed} aria-live="polite">
            {deposits.data?.slice(0, 12).map((d) => (
              <li key={d.id} className={styles.feedRow}>
                <span className={styles.feedTime}>{clock(d.seenAt)}</span>
                <span className={styles.feedMain}>
                  <strong>{amount(d.amount)} CC</strong> for <strong>{d.customerRef}</strong>
                  <span className={styles.feedFrom}>from {d.senderLabel}, no memo</span>
                  {d.reason && (
                    <span className={d.state === 'failed' ? styles.feedFailed : styles.feedFrom}>
                      {d.state === 'failed' ? d.reason : `${d.reason} Trying again shortly.`}
                    </span>
                  )}
                </span>
                <span className={styles.feedState}>
                  <StatePill state={d.state} />
                  {manage && d.state === 'failed' && (
                    <>
                      <ActionButton
                        url={`/api/app/deposits/${encodeURIComponent(d.id)}/retry`}
                        label={`Retry ${amount(d.amount)} CC deposit for ${d.customerRef}`}
                        idle="Retry"
                        busy="Retrying"
                      />
                      <ActionButton
                        url={`/api/app/deposits/${encodeURIComponent(d.id)}/dismiss`}
                        label={`Dismiss ${amount(d.amount)} CC deposit for ${d.customerRef}`}
                        idle="Dismiss"
                        busy="Dismissing"
                      />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
