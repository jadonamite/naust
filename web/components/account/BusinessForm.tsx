'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import styles from './account.module.css'

export function BusinessForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/app/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.replace('/app')
      router.refresh()
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="business">
          Business name
        </label>
        <input
          id="business"
          className={styles.input}
          autoComplete="organization"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!error}
          aria-describedby="business-hint"
          autoFocus
        />
        <p id="business-hint" className={styles.hint}>
          Your customers see this name next to their deposit address.
        </p>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button type="submit" className={styles.primary} disabled={!name.trim() || busy}>
        {busy ? 'Creating' : 'Create business'}
      </button>
    </form>
  )
}
