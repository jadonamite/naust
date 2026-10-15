import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccountHeader } from '@/components/account/AccountHeader'
import { MeScreen } from '@/components/account/MeScreen'
import { currentUser } from '@/lib/session.ts'

export const metadata: Metadata = { title: 'Your deposits · Naust', robots: { index: false } }

export default async function MePage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in?next=/me')
  return (
    <div className="app-theme">
      <AccountHeader who={user.email} />
      <MeScreen />
    </div>
  )
}
