'use client'

import { useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import styles from './app.module.css'

// Sends a failed deposit back into processing. The feed shows the new state on its next poll.
export function RetryButton({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const retry = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/ui/deposits/${encodeURIComponent(id)}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" className={styles.action} onClick={retry} disabled={busy} aria-label={label}>
      <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
      <span>{busy ? 'Retrying' : failed ? 'Try again' : 'Retry'}</span>
    </button>
  )
}
