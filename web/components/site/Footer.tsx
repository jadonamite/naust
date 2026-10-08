import Link from 'next/link'
import { ArrowUp } from '@phosphor-icons/react/dist/ssr'
import { Logo } from '@/components/brand/Logo'
import styles from './Footer.module.css'

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/operator', label: 'Operator view' },
      { href: '/customer/Ada', label: 'Customer view' },
      { href: '/#how', label: 'How it works' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms of service' },
      { href: '/legal/privacy', label: 'Privacy policy' },
      { href: '/legal/cookies', label: 'Cookie policy' },
    ],
  },
  {
    title: 'Project',
    links: [
      { href: 'https://appsfactory.cc/hackathons', label: 'HackCanton Season 3', external: true },
      { href: 'https://forum.canton.network/t/9207', label: 'The forum thread', external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.lead}>
          <Logo on="light" height={28} />
          <p className={`serif ${styles.tagline}`}>Every customer gets an address. Every payment identifies itself.</p>
        </div>
        <nav className={styles.columns} aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title}>
              <p className={styles.colTitle}>{col.title}</p>
              <ul>
                {col.links.map((l) =>
                  'external' in l ? (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <p className={styles.legal}>
          <span>&copy; 2026 Naust</span>
          <Link href="/legal/terms">Terms of service</Link>
          <Link href="/legal/privacy">Privacy policy</Link>
        </p>
        <a href="#top" className={styles.up}>
          Back to the top <ArrowUp size={14} weight="bold" aria-hidden="true" />
        </a>
      </div>
      <div className={styles.watermark} aria-hidden="true">
        <Logo variant="icon" on="light" height={360} />
      </div>
    </footer>
  )
}
