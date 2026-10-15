import type { ReactNode } from 'react'
import { AccountHeader } from './AccountHeader'
import styles from './account.module.css'

// The narrow single-panel layout shared by sign-in, sign-up, invites and business setup.
export function AccountPage({ who, children, foot }: { who?: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="app-theme">
      <AccountHeader who={who} />
      <main id="main-content" className={styles.page}>
        <div className={styles.panel}>
          {children}
          {foot && <p className={styles.foot}>{foot}</p>}
        </div>
      </main>
    </div>
  )
}
