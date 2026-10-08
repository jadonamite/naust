'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './CookieNotice.module.css'

const KEY = 'naust-cookie-notice'

// Naust sets no tracking cookies, so this is a notice, not a consent form. Closing it is remembered locally.
export function CookieNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY) !== 'closed')
    } catch {
      setOpen(true)
    }
  }, [])

  if (!open) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, 'closed')
    } catch {}
    setOpen(false)
  }

  return (
    <aside className={styles.notice} aria-label="Cookie notice">
      <p>
        Naust sets no tracking or advertising cookies. This site remembers only that you closed this notice.{' '}
        <Link href="/legal/cookies">Cookie policy</Link>
      </p>
      <button type="button" className="btn btn-sm btn-ink" onClick={close}>
        Got it
      </button>
    </aside>
  )
}
