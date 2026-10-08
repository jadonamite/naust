import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import styles from './app.module.css'

export function AppHeader({ current }: { current: 'operator' | 'customer' }) {
  return (
    <header className={styles.header}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Naust home">
          <Logo height={24} />
        </Link>
        <nav aria-label="Demo screens" className={styles.tabs}>
          <Link href="/operator" className={styles.tab} aria-current={current === 'operator' ? 'page' : undefined}>
            Operator
          </Link>
          <Link href="/customer/Ada" className={styles.tab} aria-current={current === 'customer' ? 'page' : undefined}>
            Customer
          </Link>
        </nav>
        <span className={styles.network}>
          <span className={styles.liveDot} aria-hidden="true" />
          Canton DevNet
        </span>
      </div>
    </header>
  )
}
