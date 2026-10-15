'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from '@/lib/auth-client'
import styles from './account.module.css'

type Step = 'age' | 'blocked' | 'email' | 'code'
type Age = 'over' | 'under' | null

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Sign-in errors in words. Anything unexpected falls back to the server's own message.
function explain(error: { code?: string; message?: string; status?: number }): string {
  switch (error.code) {
    case 'INVALID_OTP':
      return 'That code doesn’t match. Check the email and try again.'
    case 'OTP_EXPIRED':
      return 'That code has expired. Send a new one.'
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many tries with that code. Send a new one.'
  }
  if (error.status === 429) return 'Too many requests. Wait a minute, then try again.'
  return error.message || 'Something went wrong. Try again.'
}

export function SignInFlow({
  mode,
  age,
  next,
  title,
  lead,
}: {
  mode: 'sign-up' | 'sign-in'
  age: Age
  next: string
  title: string
  lead: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(age === 'under' ? 'blocked' : mode === 'sign-up' && age !== 'over' ? 'age' : 'email')
  const [birth, setBirth] = useState({ day: '', month: '', year: '' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const sendCode = async () => {
    const res = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })
    if (res.error) throw res.error
  }

  const submitAge = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: birth.day, month: birth.month, year: birth.year }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      if (body.result === 'under') return setStep('blocked')
      // Arriving here from a code that needed this step first: the code is spent, so send a fresh one.
      if (email) {
        await sendCode()
        setNotice(`We sent a new code to ${email}.`)
        setCode('')
        return setStep('code')
      }
      setStep('email')
    } catch (err) {
      setError(explain(err as Error))
    } finally {
      setBusy(false)
    }
  }

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sendCode()
      setNotice(null)
      setStep('code')
    } catch (err) {
      setError(explain(err as Error))
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await authClient.signIn.emailOtp({ email, otp: code })
      if (res.error) {
        if (res.error.code === 'AGE_CHECK_REQUIRED') return setStep('age')
        throw res.error
      }
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(explain(err as Error))
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    setError(null)
    try {
      await sendCode()
      setCode('')
      setNotice(`We sent a new code to ${email}.`)
    } catch (err) {
      setError(explain(err as Error))
    } finally {
      setBusy(false)
    }
  }

  const errorLine = error && (
    <p role="alert" className={styles.error}>
      {error}
    </p>
  )

  if (step === 'blocked') {
    return (
      <>
        <h1 className={`serif ${styles.title}`}>We can&rsquo;t create an account</h1>
        <p className={styles.lead}>Sorry, Naust can&rsquo;t create an account for you.</p>
      </>
    )
  }

  if (step === 'age') {
    const complete = birth.day && birth.month && birth.year.length === 4
    return (
      <>
        <h1 className={`serif ${styles.title}`}>Your date of birth</h1>
        <p className={styles.lead}>We ask everyone this before creating an account.</p>
        <form className={styles.form} onSubmit={submitAge} noValidate>
          <fieldset className={styles.field}>
            <legend className={styles.label}>Date of birth</legend>
            <div className={styles.dateRow}>
              <input
                className={styles.input}
                aria-label="Day"
                placeholder="Day"
                inputMode="numeric"
                autoComplete="bday-day"
                maxLength={2}
                value={birth.day}
                onChange={(e) => setBirth({ ...birth, day: e.target.value.replace(/\D/g, '') })}
                aria-invalid={!!error}
              />
              <select
                className={styles.input}
                aria-label="Month"
                autoComplete="bday-month"
                value={birth.month}
                onChange={(e) => setBirth({ ...birth, month: e.target.value })}
                aria-invalid={!!error}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                aria-label="Year"
                placeholder="Year"
                inputMode="numeric"
                autoComplete="bday-year"
                maxLength={4}
                value={birth.year}
                onChange={(e) => setBirth({ ...birth, year: e.target.value.replace(/\D/g, '') })}
                aria-invalid={!!error}
              />
            </div>
          </fieldset>
          {errorLine}
          <button type="submit" className={styles.primary} disabled={!complete || busy}>
            {busy ? 'Checking' : 'Continue'}
          </button>
        </form>
      </>
    )
  }

  if (step === 'code') {
    return (
      <>
        <h1 className={`serif ${styles.title}`}>Check your email</h1>
        <p className={styles.lead}>{notice ?? `We sent a 6-digit code to ${email}.`}</p>
        <form className={styles.form} onSubmit={submitCode} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="code">
              Code
            </label>
            <input
              id="code"
              className={`${styles.input} ${styles.code}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-invalid={!!error}
              aria-describedby="code-hint"
              autoFocus
            />
            <p id="code-hint" className={styles.hint}>
              It works for 10 minutes.
            </p>
          </div>
          {errorLine}
          <button type="submit" className={styles.primary} disabled={code.length !== 6 || busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>
          <div className={styles.links}>
            <button type="button" className={styles.secondary} onClick={resend} disabled={busy}>
              Send a new code
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => (setStep('email'), setCode(''), setError(null), setNotice(null))}
            >
              Use a different email
            </button>
          </div>
        </form>
      </>
    )
  }

  return (
    <>
      <h1 className={`serif ${styles.title}`}>{title}</h1>
      <p className={styles.lead}>{lead}</p>
      <form className={styles.form} onSubmit={submitEmail} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            aria-invalid={!!error}
            autoFocus
          />
        </div>
        {errorLine}
        <button type="submit" className={styles.primary} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || busy}>
          {busy ? 'Sending code' : 'Send code'}
        </button>
      </form>
    </>
  )
}
