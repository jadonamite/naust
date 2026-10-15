import type { ReceiptView } from '@/lib/views.ts'
import { amount, day, short } from './usePoll'
import styles from './app.module.css'

// Deposit receipts as the ledger shows them to the customer's own address.
export function ReceiptList({ receipts }: { receipts: ReceiptView[] }) {
  return (
    <ol className={styles.receipts} aria-live="polite">
      {receipts.map((r) => (
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
  )
}
