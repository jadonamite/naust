import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccountHeader } from '@/components/account/AccountHeader'
import { OperatorScreen } from '@/components/app/OperatorScreen'
import { membershipsOf } from '@/lib/businesses.ts'
import { customersOfUser } from '@/lib/invites.ts'
import { currentUser } from '@/lib/session.ts'

export const metadata: Metadata = { title: 'Deposits · Naust', robots: { index: false } }

// The signed-in operator's own business. People without one go to set it up, or to their receipts if they're a customer.
export default async function AppPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in?next=/app')
  const [business] = await membershipsOf(user.id)
  if (!business) redirect((await customersOfUser(user.id)).length ? '/me' : '/app/new')
  return (
    <div className="app-theme">
      <AccountHeader who={`${business.name} · ${user.email}`} />
      <OperatorScreen api="/api/app" title={business.name} />
    </div>
  )
}
