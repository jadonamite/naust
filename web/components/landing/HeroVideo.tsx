'use client'

import { useEffect, useRef } from 'react'
import styles from './Hero.module.css'

// Reduced motion keeps the still frame: the video never starts.
export function HeroVideo({ poster }: { poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => (query.matches ? video.pause() : video.play().catch(() => {}))
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return (
    <video ref={ref} className={styles.media} poster={poster} muted loop playsInline preload="metadata">
      <source src="/hero/landscape.webm" type="video/webm" />
      <source src="/hero/landscape.mp4" type="video/mp4" />
    </video>
  )
}
