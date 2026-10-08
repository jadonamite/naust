import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr'
import { HeroVideo } from './HeroVideo'
import styles from './Hero.module.css'

// Optional media: each piece renders only if its file exists in public/.
const has = (p: string) => existsSync(join(/*turbopackIgnore: true*/ process.cwd(), 'public', p))

export function Hero() {
  const video = has('hero/landscape.mp4')
  const poster = has('hero/landscape-poster.jpg') ? '/hero/landscape-poster.jpg' : undefined
  const glow = has('hero/glow.jpg')
  const cells = has('hero/cells.jpg')

  return (
    <section id="hero" className={styles.frame} aria-labelledby="hero-title">
      <div className={styles.field} style={glow ? { backgroundImage: 'url(/hero/glow.jpg)' } : undefined}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <span className={styles.ring} aria-hidden="true" />
              Deposit routing for Canton
            </p>
            <h1 id="hero-title" className={styles.title}>
              Every customer gets an address. Every payment identifies itself.
            </h1>
            <p className={styles.lead}>
              Hand each customer their own Canton address. Whatever lands there is credited to them in seconds and
              swept to your treasury.
            </p>
            <div className={styles.actions}>
              <Link href="/operator" className="btn btn-lg btn-light">
                Open the demo
              </Link>
              <a href="#how" className="btn btn-lg btn-outline-light">
                How it works
              </a>
            </div>
          </div>

          <div className={styles.orbit} aria-hidden="true">
            <div className={styles.ringLine} />
            <div className={styles.window}>
              {video ? (
                <HeroVideo poster={poster} />
              ) : poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated still, already sized
                <img src={poster} alt="" className={styles.media} />
              ) : null}
            </div>
          </div>

          <aside className={styles.side}>
            <div className={styles.card}>
              {cells && (
                // eslint-disable-next-line @next/next/no-img-element -- generated still, already sized
                <img src="/hero/cells.jpg" alt="" className={styles.media} />
              )}
            </div>
            <Link href="/customer/Ada" className={styles.caption}>
              <span>Ada&rsquo;s receipts</span>
              <span className={styles.captionMuted}>Customer view</span>
              <ArrowUpRight size={18} weight="bold" aria-hidden="true" className={styles.captionIcon} />
            </Link>
          </aside>
        </div>

        <p className={styles.giant} aria-hidden="true">
          <span>N</span>
          <span>A</span>
          <span>U</span>
          <span>S</span>
          <span>T</span>
        </p>
      </div>
    </section>
  )
}
