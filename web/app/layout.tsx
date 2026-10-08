import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import { CookieNotice } from '@/components/site/CookieNotice'
import './globals.css'

// Downloaded at build time and served from our own domain: no runtime request to Google.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
})

const tagline = 'Every customer gets an address. Every payment identifies itself.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Naust',
  description: tagline,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: { title: 'Naust', description: tagline, images: ['/og.png'], type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Naust', description: tagline, images: ['/og.png'] },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F1' },
    { media: '(prefers-color-scheme: dark)', color: '#111112' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>
        {children}
        <CookieNotice />
      </body>
    </html>
  )
}
