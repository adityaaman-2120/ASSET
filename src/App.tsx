import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { MarqueeBar } from './components/sections/MarqueeBar'
import { CoreFeatures } from './components/sections/CoreFeatures'
import { SocialProof } from './components/sections/SocialProof'
import { CTA } from './components/sections/CTA'

export default function App() {
  return (
    <div className="relative min-h-screen bg-[#F4E1C1] overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <MarqueeBar />
        <CoreFeatures />
        <SocialProof />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
