import type { Metadata } from 'next'
import { AppHeader } from '@/components/app/AppHeader'
import { OperatorScreen } from '@/components/app/OperatorScreen'

export const metadata: Metadata = { title: 'Operator · Naust' }

export default function OperatorPage() {
  return (
    <div className="app-theme">
      <AppHeader current="operator" />
      <OperatorScreen />
    </div>
  )
}
