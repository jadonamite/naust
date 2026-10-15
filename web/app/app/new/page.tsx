import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccountPage } from '@/components/account/AccountPage'
import { BusinessForm } from '@/components/account/BusinessForm'
import { membershipsOf } from '@/lib/businesses.ts'
import { currentUser } from '@/lib/session.ts'
import styles from '@/components/account/account.module.css'

export const metadata: Metadata = { title: 'Set up your business · Naust', robots: { index: false } }

export default async function NewBusinessPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in?next=/app/new')
  if ((await membershipsOf(user.id)).length) redirect('/app')
  return (
    <AccountPage who={user.email}>
      <h1 className={`serif ${styles.title}`}>Set up your business</h1>
      <p className={styles.lead}>Each of your customers will get a deposit address under this business.</p>
      <BusinessForm />
    </AccountPage>
  )
}
