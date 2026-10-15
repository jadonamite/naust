'use client'

import { useState } from 'react'
import styles from './app.module.css'

// A button that POSTs to one URL. The screen shows the outcome on its next poll; a failed request says so here.
export function ActionButton({ url, label, idle, busy }: { url: string; label: string; idle: string; busy: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')
  const run = async () => {
    setState('busy')
    try {
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('idle')
    } catch {
      setState('failed')
    }
  }
  return (
    <button type="button" className={styles.action} onClick={run} disabled={state === 'busy'} aria-label={label}>
      {state === 'busy' ? busy : state === 'failed' ? 'Try again' : idle}
    </button>
  )
}
