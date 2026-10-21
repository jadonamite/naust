import type { Metadata } from 'next'
import Link from 'next/link'
import { AppHeader } from '@/components/app/AppHeader'
import { OperatorScreen } from '@/components/app/OperatorScreen'
import { publicBusinesses } from '@/lib/businesses.ts'
import { listCustomers } from '@/lib/customers.ts'
import styles from '@/components/app/app.module.css'

export const metadata: Metadata = { title: 'Operator · Naust' }
export const dynamic = 'force-dynamic'

// Read-only operator screens. The switcher picks which public business to show.
export default async function OperatorPage({ searchParams }: PageProps<'/operator'>) {
  const operators = await publicBusinesses()
  const asked = (await searchParams).op
  const current = operators.find((b) => b.public_slug === asked) ?? operators[0]
  const op = current && current !== operators[0] ? current.public_slug ?? undefined : undefined
  const firstCustomer = current ? (await listCustomers(current.id))[0]?.ref : undefined
  return (
    <div className="app-theme">
      <AppHeader current="operator" op={op} customerRef={firstCustomer} />
      {operators.length > 1 && (
        <nav aria-label="Operators" className={`${styles.tabs} ${styles.operatorSwitch}`}>
          {operators.map((b) => (
            <Link
              key={b.id}
              href={b === operators[0] ? '/operator' : `/operator?op=${encodeURIComponent(b.public_slug!)}`}
              className={styles.tab}
              aria-current={b.id === current?.id ? 'page' : undefined}
            >
              {b.name}
            </Link>
          ))}
        </nav>
      )}
      <OperatorScreen op={op} title={current?.name} key={current?.id} />
    </div>
  )
}
