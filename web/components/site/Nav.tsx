'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import styles from './Nav.module.css'

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/#ledger', label: 'Receipts' },
  { href: '/#builders', label: 'Who it’s for' },
  { href: '/#faq', label: 'FAQ' },
]

// Over the dark hero the bar is clear with light type; past it, it becomes a paper glass bar.
export function Nav({ overDark = false }: { overDark?: boolean }) {
  const [scrolled, setScrolled] = useState(!overDark)

  useEffect(() => {
    if (!overDark) return
    const hero = document.getElementById('hero')
    const update = () => setScrolled(window.scrollY > (hero ? hero.offsetHeight - 80 : 40))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [overDark])

  const dark = overDark && !scrolled
  return (
    <header className={`${styles.bar} ${scrolled ? styles.solid : ''} ${dark ? styles.onDark : ''}`}>
      <nav className={styles.inner} aria-label="Main">
        <Link href="/" className={styles.brand} aria-label="Naust home">
          <Logo on={dark ? 'dark' : 'light'} height={26} />
        </Link>
        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={styles.link}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link href="/operator" className={`btn btn-sm ${dark ? 'btn-light' : 'btn-accent'}`}>
          Open the demo
        </Link>
      </nav>
    </header>
  )
}
