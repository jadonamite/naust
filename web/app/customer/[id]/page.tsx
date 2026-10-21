import type { Metadata } from 'next'
import { AppHeader } from '@/components/app/AppHeader'
import { CustomerScreen } from '@/components/app/CustomerScreen'

export const metadata: Metadata = { title: 'Customer · Naust' }

export default async function CustomerPage({ params, searchParams }: PageProps<'/customer/[id]'>) {
  const { id } = await params
  const op = (await searchParams).op
  const slug = typeof op === 'string' ? op : undefined
  const ref = decodeURIComponent(id)
  return (
    <div className="app-theme">
      <AppHeader current="customer" op={slug} customerRef={ref} />
      <CustomerScreen id={ref} op={slug} />
    </div>
  )
}
