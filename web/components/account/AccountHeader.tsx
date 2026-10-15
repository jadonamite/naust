'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import { authClient } from '@/lib/auth-client'
import styles from '@/components/app/app.module.css'

// Header for signed-in screens: who is signed in, and the way out.
export function AccountHeader({ who }: { who?: string }) {
  const router = useRouter()
  const signOut = async () => {
    await authClient.signOut()
    router.replace('/')
    router.refresh()
  }
  return (
    <header className={styles.header}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Naust home">
          <Logo height={24} />
        </Link>
        {who && (
          <span className={styles.headerUser}>
            <span>{who}</span>
            <button type="button" className={styles.action} onClick={signOut}>
              Sign out
            </button>
          </span>
        )}
      </div>
    </header>
  )
}
