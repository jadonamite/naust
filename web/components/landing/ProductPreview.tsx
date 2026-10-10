'use client'

import { useEffect, useRef, useState } from 'react'
import type { CustomerView, DepositView } from '@/lib/views.ts'
import { AppHeader } from '@/components/app/AppHeader'
import { OperatorView } from '@/components/app/OperatorScreen'
import { partyName, senderName } from '@/lib/party.ts'
import styles from './ProductPreview.module.css'

// The real operator screen, rendered from a snapshot of Canton DevNet data taken on 7 Oct 2026.
const NS = '12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e'
const TREASURY = `86bb3d93-2187-41d4-8150-15a31b7d061e::${NS}`
const EXCHANGE = `86bb3d93-Exchange::${NS}`

const customer = (id: string, ref: string, deposits: number, received: string): CustomerView => ({
  id,
  ref,
  address: `86bb3d93-${ref}::${NS}`,
  label: partyName(`86bb3d93-${ref}::${NS}`),
  accountCid: null,
  createdAt: '2026-10-06T14:31:38.815Z',
  deposits,
  received,
  lastDepositAt: null,
})

const deposit = (id: string, ref: string, amount: string, sender: string, seenAt: string): DepositView => ({
  id,
  customerId: ref,
  customerRef: ref,
  amount,
  instrument: 'Amulet',
  sender,
  senderLabel: senderName(sender),
  state: 'swept',
  reason: null,
  seenAt,
  updatedAt: seenAt,
  acceptUpdateId: null,
  sweepUpdateId: null,
  receiptCid: null,
})

const SNAPSHOT = {
  treasury: { loading: false, data: { party: TREASURY, label: partyName(TREASURY), balance: '962.1619384779' } },
  customers: {
    loading: false,
    data: [
      customer('cus_ea812751b3884d77', 'Ada', 11, '5.4'),
      customer('cus_f0c3b775c7bb4189', 'Ben', 12, '17.9'),
      customer('cus_627eb0e2e6234a72', 'Tokunbo', 6, '1.5'),
    ],
  },
  deposits: {
    loading: false,
    data: [
      deposit('d1', 'Ben', '12.5', EXCHANGE, '2026-10-07T13:51:39.390Z'),
      deposit('d2', 'Ada', '1.5', TREASURY, '2026-10-06T14:36:23.109Z'),
      deposit('d3', 'Tokunbo', '1.0', TREASURY, '2026-10-06T14:36:23.012Z'),
      deposit('d4', 'Ben', '2.5', TREASURY, '2026-10-06T14:36:22.950Z'),
    ],
  },
}

const DESIGN_WIDTH = 1280
// Below this width (app.module.css, 44rem) the preview shows the app's phone layout at full size.
const PHONE_MAX = 704

export function ProductPreview() {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, width: DESIGN_WIDTH, height: 0 })

  // Wider than a phone: lay the screen out at desktop width, then scale it down to the space available.
  // Phone: render the phone layout at the width available, unscaled.
  useEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const measure = () => {
      const width = o.clientWidth <= PHONE_MAX ? o.clientWidth : Math.max(DESIGN_WIDTH, o.clientWidth)
      const scale = o.clientWidth / width
      setFit({ scale, width, height: i.offsetHeight * scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [])

  return (
    <section className={styles.section} aria-label="The operator screen">
      <figure className={styles.window}>
        <div className={styles.chrome} aria-hidden="true">
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.url}>Naust · Operator</span>
        </div>
        <div ref={outer} className={styles.viewport} style={{ height: fit.height || undefined }}>
          <div
            ref={inner}
            className={styles.screen}
            style={{ width: fit.width, transform: `scale(${fit.scale})` }}
            inert
            aria-hidden="true"
          >
            <AppHeader current="operator" />
            <OperatorView {...SNAPSHOT} demoNote={false} />
          </div>
        </div>
        <figcaption className="visually-hidden">
          The Naust operator screen: a treasury balance of 962 CC, three customers with their own
          deposit addresses, and the latest deposits, each swept to treasury.
        </figcaption>
      </figure>
    </section>
  )
}
