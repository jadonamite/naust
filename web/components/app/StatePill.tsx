import styles from './app.module.css'

const words: Record<string, string> = {
  seen: 'Seen',
  accepted: 'Accepted',
  receipted: 'Receipted',
  sweeping: 'Sweeping',
  swept: 'Swept to treasury',
  failed: 'Failed',
}

// The word always carries the state; colour only reinforces it.
export function StatePill({ state }: { state: string }) {
  const tone = state === 'swept' ? styles.done : state === 'failed' ? styles.failed : styles.progress
  return <span className={`${styles.pill} ${tone}`}>{words[state] ?? state}</span>
}
