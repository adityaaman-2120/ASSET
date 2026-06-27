import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Intelligence', href: '#intelligence' },
  { label: 'Simulator', href: '#simulator' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[rgba(244,225,193,0.92)] backdrop-blur-2xl border-b border-[rgba(0,128,128,0.12)] shadow-[0_1px_0_rgba(0,128,128,0.08)]'
          : 'bg-transparent'
      }`}
    >
      <Container>
        <nav className="flex items-center justify-between py-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group" aria-label="ASSETS home">
            {/* Lettermark */}
            <div
              className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #008080, #006666)',
                boxShadow: '0 2px 14px rgba(0,128,128,0.35)',
              }}
            >
              <span
                className="font-['Syne'] font-extrabold text-[#F4E1C1] text-lg leading-none select-none"
              >
                A
              </span>
              {/* corner accent */}
              <span
                className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-[rgba(244,225,193,0.5)]"
              />
            </div>

            {/* Wordmark */}
            <div>
              <div className="font-['Syne'] font-extrabold text-[1.1rem] tracking-[0.06em] text-[#0d2b2b] leading-none">
                ASSETS
              </div>
              <div className="font-['Space_Mono'] text-[8px] tracking-[0.22em] text-[#008080]/55 uppercase mt-0.5 leading-none">
                AI Portfolio Engine
              </div>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[#0d2b2b]/55 hover:text-[#008080] rounded-xl hover:bg-[rgba(0,128,128,0.06)] transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-sm font-medium text-[#0d2b2b]/50 hover:text-[#008080] transition-colors duration-200 px-3 py-2"
            >
              Sign In
            </a>
            <Button variant="primary" size="sm" href="/onboarding">
              Get Started
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-[#0d2b2b]/60 hover:text-[#008080] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </Container>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(0,128,128,0.1)] bg-[rgba(244,225,193,0.97)] backdrop-blur-2xl">
          <Container>
            <div className="py-5 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 text-sm text-[#0d2b2b]/60 hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)] rounded-xl transition-all duration-200 font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-[rgba(0,128,128,0.1)] flex flex-col gap-2.5 mt-1">
                <a
                  href="/dashboard"
                  className="w-full text-center py-2.5 text-sm font-medium text-[#0d2b2b]/60 border border-[rgba(0,128,128,0.2)] rounded-xl hover:bg-[rgba(0,128,128,0.06)] transition-all"
                >
                  Sign In
                </a>
                <Button variant="primary" size="sm" href="/onboarding" className="w-full justify-center">
                  Get Started
                </Button>
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
