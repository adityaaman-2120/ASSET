import { Routes, Route } from 'react-router-dom'

// ── Homepage sections ──────────────────────────────────────────────
import { Header }       from './home/components/layout/Header'
import { Footer }       from './home/components/layout/Footer'
import { Hero }         from './home/components/sections/Hero'
import { MarqueeBar }   from './home/components/sections/MarqueeBar'
import { CoreFeatures } from './home/components/sections/CoreFeatures'
import { SocialProof }  from './home/components/sections/SocialProof'
import { CTA }          from './home/components/sections/CTA'

// ── App pages ─────────────────────────────────────────────────────
import Onboarding      from './app/pages/Onboarding'
import ProfileSummary  from './app/pages/ProfileSummary'
import Dashboard       from './app/pages/Dashboard'

function HomePage() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<HomePage />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/summary"   element={<ProfileSummary />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
