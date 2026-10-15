'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './account.module.css'

const MESSAGES: Record<string, string> = {
  used: 'This invite has already been used. Ask the business for a new one.',
  expired: 'This invite has expired. Ask the business for a new one.',
  unknown: 'This invite link isn’t valid. Check you copied all of it.',
}

export function AcceptInvite({ token, businessName }: { token: string; businessName: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/me/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      if (body.state !== 'valid') throw new Error(MESSAGES[body.state])
      router.replace('/me')
      router.refresh()
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.')
      setBusy(false)
    }
  }
  return (
    <div className={styles.form}>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button type="button" className={styles.primary} onClick={accept} disabled={busy}>
        {busy ? 'Adding' : `Add ${businessName} to my account`}
      </button>
    </div>
  )
}
