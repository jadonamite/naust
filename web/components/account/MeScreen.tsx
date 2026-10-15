'use client'

import type { ReceiptView } from '@/lib/views.ts'
import { CopyButton } from '@/components/app/CopyButton'
import { ReceiptList } from '@/components/app/ReceiptList'
import { usePoll } from '@/components/app/usePoll'
import styles from '@/components/app/app.module.css'

type MyCustomer = { id: string; ref: string; business: string; address: string; receipts: ReceiptView[] | null }

// A signed-in customer's deposit address at each business that invited them, with its receipts from the ledger.
export function MeScreen() {
  const me = usePoll<MyCustomer[]>('/api/me', 5000)
  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={`serif ${styles.title}`}>Your deposits</h1>
          <p className={styles.subtitle}>
            Read from the ledger as your own address. Only your receipts are visible here, and the ledger enforces it.
          </p>
        </div>
      </div>

      {me.loading && <p className={styles.empty}>Loading your deposits…</p>}
      {me.error && !me.data && <p className={styles.empty}>Can&rsquo;t load your deposits. Retrying.</p>}
      {me.data && me.data.length === 0 && (
        <p className={styles.empty}>
          No deposit addresses yet. When a business invites you, open their link and it appears here.
        </p>
      )}
      {me.data?.map((c) => (
        <section key={c.id} className={`${styles.card} ${styles.addressCard}`} aria-labelledby={`biz-${c.id}`}>
          <h2 id={`biz-${c.id}`} className={styles.cardTitle}>
            {c.business}
          </h2>
          <p className={styles.cardLead}>
            Send to this address from any exchange or wallet. You don&rsquo;t need a memo: the address itself tells{' '}
            {c.business} it&rsquo;s you.
          </p>
          <div className={styles.bigAddress}>
            <code>{c.address}</code>
            <CopyButton value={c.address} label={`Copy your ${c.business} deposit address`} />
          </div>
          {c.receipts === null ? (
            <p className={styles.empty}>Can&rsquo;t reach {c.business}&rsquo;s ledger right now. Retrying.</p>
          ) : c.receipts.length === 0 ? (
            <p className={styles.empty}>No deposits yet. Your receipt appears here once you send to this address.</p>
          ) : (
            <ReceiptList receipts={c.receipts} />
          )}
        </section>
      ))}
    </main>
  )
}
