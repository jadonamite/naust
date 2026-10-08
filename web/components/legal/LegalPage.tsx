import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'
import styles from './legal.module.css'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <span id="top" />
      <Nav />
      <main className={styles.main}>
        <p className={styles.kicker}>Legal</p>
        <h1 className={`serif ${styles.title}`}>{title}</h1>
        <p className={styles.meta}>Last updated {updated}. This page has not been reviewed by a lawyer.</p>
        <div className={styles.body}>{children}</div>
      </main>
      <Footer />
    </>
  )
}
