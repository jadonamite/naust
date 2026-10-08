import logoOnLight from './naust-logo-on-light.svg'
import logoOnDark from './naust-logo-on-dark.svg'
import iconOnLight from './naust-icon-on-light.svg'
import iconOnDark from './naust-icon-on-dark.svg'

type Props = {
  /** Full logo (mark + name) or the mark alone. */
  variant?: 'logo' | 'icon'
  /** Which background it sits on. "auto" follows the system colour scheme. */
  on?: 'auto' | 'light' | 'dark'
  height?: number
  className?: string
}

const files = {
  logo: { light: logoOnLight.src, dark: logoOnDark.src },
  icon: { light: iconOnLight.src, dark: iconOnDark.src },
}

export function Logo({ variant = 'logo', on = 'auto', height = 28, className }: Props) {
  const set = files[variant]
  const img = (src: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- vector logo, no resizing needed
    <img src={src} alt="Naust" height={height} className={className} style={{ height, width: 'auto', display: 'block' }} />
  )
  if (on !== 'auto') return img(set[on])
  return (
    <picture>
      <source srcSet={set.dark} media="(prefers-color-scheme: dark)" />
      {img(set.light)}
    </picture>
  )
}
