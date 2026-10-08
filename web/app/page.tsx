import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'
import { Hero } from '@/components/landing/Hero'
import { ProductPreview } from '@/components/landing/ProductPreview'
import {
  Builders,
  Cta,
  Faq,
  Ledger,
  LiveMatching,
  Precedent,
  Quotes,
  Statement,
  TwoCards,
  WhyItHolds,
} from '@/components/landing/Sections'

export default function Home() {
  return (
    <>
      <span id="top" />
      <Nav overDark />
      <main>
        <Hero />
        <ProductPreview />
        <Statement />
        <LiveMatching />
        <TwoCards />
        <WhyItHolds />
        <Ledger />
        <Precedent />
        <Quotes />
        <Builders />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  )
}
