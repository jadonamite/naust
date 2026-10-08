'use client'

import { useEffect, useState } from 'react'

export type Poll<T> = { data?: T; error?: string; loading: boolean }

// Fetches JSON now and every `ms` after, keeping the last good data through a failed poll.
export function usePoll<T>(url: string | null, ms = 2000): Poll<T> {
  const [state, setState] = useState<Poll<T>>({ loading: true })

  useEffect(() => {
    if (!url) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
        if (alive) setState({ data: body, loading: false })
      } catch (e) {
        if (alive) setState((s) => ({ ...s, error: (e as Error).message, loading: false }))
      }
      if (alive) timer = setTimeout(tick, ms)
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [url, ms])

  return state
}

export const amount = (s: string) => Number(s).toLocaleString('en', { maximumFractionDigits: 4 })
// Time only for today; date and time for anything older.
export const clock = (iso: string) => {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
export const day = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const short = (id: string, head = 10) => (id.length > head + 8 ? `${id.slice(0, head)}…${id.slice(-6)}` : id)
