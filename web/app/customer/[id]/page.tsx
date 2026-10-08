import type { Metadata } from 'next'
import { AppHeader } from '@/components/app/AppHeader'
import { CustomerScreen } from '@/components/app/CustomerScreen'

export const metadata: Metadata = { title: 'Customer · Naust' }

export default async function CustomerPage({ params }: PageProps<'/customer/[id]'>) {
  const { id } = await params
  return (
    <div className="app-theme">
      <AppHeader current="customer" />
      <CustomerScreen id={decodeURIComponent(id)} />
    </div>
  )
}
