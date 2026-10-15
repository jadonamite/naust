'use client'

import { useState } from 'react'
import { CopyButton } from './CopyButton'
import styles from './app.module.css'

// Makes a single-use sign-up link for one customer and shows it once, to copy and send.
export function InviteButton({ customerId, customerRef }: { customerId: string; customerRef: string }) {
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'failed' } | { status: 'ready'; url: string }>({
    status: 'idle',
  })
  const invite = async () => {
    setState({ status: 'busy' })
    try {
      const res = await fetch(`/api/app/customers/${encodeURIComponent(customerId)}/invite`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState({ status: 'ready', url: (await res.json()).url })
    } catch {
      setState({ status: 'failed' })
    }
  }
  if (state.status === 'ready') {
    return (
      <span className={styles.invite}>
        <span className={styles.inviteNote}>Send {customerRef} this link. It works once, for 7 days.</span>
        <span className={styles.address}>
          <code className={styles.inviteUrl}>{state.url}</code>
          <CopyButton value={state.url} label={`Copy ${customerRef}'s invite link`} />
        </span>
      </span>
    )
  }
  return (
    <button
      type="button"
      className={styles.action}
      onClick={invite}
      disabled={state.status === 'busy'}
      aria-label={`Invite ${customerRef} to see their receipts`}
    >
      {state.status === 'busy' ? 'Making link' : state.status === 'failed' ? 'Try again' : 'Invite'}
    </button>
  )
}
