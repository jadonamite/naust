'use client'

import Link from 'next/link'
import type { CustomerView, ReceiptView } from '@/lib/views.ts'
import { CopyButton } from './CopyButton'
import { amount, day, short, usePoll } from './usePoll'
import { partyName } from '@/lib/party.ts'
import styles from './app.module.css'

export function CustomerScreen({ id }: { id: string }) {
  const path = `/api/ui/customers/${encodeURIComponent(id)}`
  const customer = usePoll<CustomerView>(path, 10000)
  const receipts = usePoll<ReceiptView[]>(`${path}/receipts`, 3000)

  if (customer.error === 'customer not found') {
    return (
      <main className={styles.main}>
        <h1 className={`serif ${styles.title}`}>No such customer</h1>
        <p className={styles.subtitle}>
          There&rsquo;s no customer called &ldquo;{id}&rdquo;. <Link href="/operator">See all customers</Link>
        </p>
      </main>
    )
  }

  const c = customer.data
  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}>
        <div>
          <p className={styles.kicker}>Customer view</p>
          <h1 className={`serif ${styles.title}`}>{c ? `${c.ref}’s deposits` : 'Deposits'}</h1>
          <p className={styles.subtitle}>
            Read from the ledger as your own address. Only your receipts are visible here, and the ledger enforces it.
          </p>
        </div>
      </div>

      <section className={`${styles.card} ${styles.addressCard}`} aria-labelledby="address-title">
        <h2 id="address-title" className={styles.cardTitle}>
          Your deposit address
        </h2>
        <p className={styles.cardLead}>
          Send to this address from any exchange or wallet. You don&rsquo;t need a memo: the address itself tells the
          business it&rsquo;s you.
        </p>
        {c ? (
          <div className={styles.bigAddress}>
            <code title={c.address}>{partyName(c.address)}</code>
            <CopyButton value={c.address} label="Copy your deposit address" />
          </div>
        ) : (
          <p className={styles.empty}>{customer.error ? 'Can’t reach the ledger. Retrying.' : 'Loading your address…'}</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="receipts-title">
        <h2 id="receipts-title" className={styles.cardTitle}>
          Receipts
        </h2>
        {receipts.error && !receipts.data && <p className={styles.empty}>Can&rsquo;t reach the ledger. Retrying.</p>}
        {receipts.data && receipts.data.length === 0 && (
          <p className={styles.empty}>No deposits yet. Once you send to the address above, your receipt appears here.</p>
        )}
        {receipts.data && receipts.data.length > 0 && (
          <ol className={styles.receipts} aria-live="polite">
            {receipts.data.map((r) => (
              <li key={r.cid} className={styles.receipt}>
                <div className={styles.receiptHead}>
                  <p className={`serif ${styles.receiptAmount}`}>{amount(r.amount)} CC</p>
                  <p className={styles.receiptWhen}>{day(r.receivedAt)}</p>
                </div>
                <dl className={styles.receiptFields}>
                  <dt>From</dt>
                  <dd>{r.senderLabel}</dd>
                  <dt>Accepted in</dt>
                  <dd>
                    <code>{short(r.acceptUpdateId)}</code>
                  </dd>
                  <dt>Swept in</dt>
                  <dd>{r.sweepUpdateId ? <code>{short(r.sweepUpdateId)}</code> : 'In progress'}</dd>
                  <dt>Receipt</dt>
                  <dd>
                    <code>{short(r.cid)}</code>
                  </dd>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
