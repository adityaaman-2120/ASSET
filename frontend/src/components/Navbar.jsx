import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LayoutDashboard, Compass, ClipboardList, LogOut, LogIn, UserPlus, Phone } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isLanding = pathname === '/'

  const navLinks = isAuthenticated
    ? [
        { label: 'Dashboard',   href: '/dashboard',    icon: LayoutDashboard },
        { label: 'Analyze',     href: '/analyze',      icon: Compass },
        { label: 'Questionnaire', href: '/questionnaire', icon: ClipboardList },
      ]
    : [
        { label: 'How It Works', href: '#how-it-works', icon: null },
        { label: 'Features',     href: '#features',     icon: null },
      ]

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || !isLanding
          ? 'bg-[rgba(244,225,193,0.92)] backdrop-blur-2xl border-b border-[rgba(0,128,128,0.12)] shadow-[0_1px_0_rgba(0,128,128,0.08)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <nav className="flex items-center justify-between py-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="ASSETS home">
            <div
              className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #008080, #006666)',
                boxShadow: '0 2px 14px rgba(0,128,128,0.35)',
              }}
            >
              <span className="font-['Syne'] font-extrabold text-[#F4E1C1] text-lg leading-none select-none">A</span>
              <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-[rgba(244,225,193,0.5)]" />
            </div>
            <div>
              <div className="font-['Syne'] font-extrabold text-[1.1rem] tracking-[0.06em] leading-none text-[#0d2b2b]">ASSETS</div>
              <div className="font-['Space_Mono'] text-[8px] tracking-[0.22em] text-[#008080]/75 uppercase mt-0.5 leading-none">AI Portfolio Engine</div>
            </div>
          </Link>
          <Link
                  to="/voice-call"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith('/voice-call')
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  <span className="hidden sm:inline">Voice Call</span>
                </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = link.href.startsWith('/') && pathname.startsWith(link.href)
              return (
                link.href.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0d2b2b]/65 hover:text-[#008080] rounded-xl hover:bg-[rgba(0,128,128,0.06)] transition-all duration-200"
                  >
                    {Icon && <Icon size={14} />}
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[rgba(0,128,128,0.15)] text-[#008080]'
                        : 'text-[#0d2b2b]/65 hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)]'
                    }`}
                  >
                    {Icon && <Icon size={14} />}
                    {link.label}
                  </Link>
                )
              )
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#F4E1C1]"
                    style={{ background: 'linear-gradient(135deg, #008080, #006666)' }}
                  >
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="font-['Space_Mono'] text-[10px] hidden md:inline max-w-[120px] truncate text-[#0d2b2b]/70 font-semibold">
                    {user?.full_name || user?.email}
                  </span>
                </div>
                <div className="w-px h-4 bg-[rgba(0,128,128,0.2)]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)] rounded-xl transition-all text-[#0d2b2b]/70"
                  title="Logout"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="flex items-center gap-1.5 text-sm font-medium text-[#0d2b2b]/50 hover:text-[#008080] transition-colors duration-200 px-3 py-2"
                >
                  <LogIn size={14} />
                  Sign In
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#F4E1C1] transition-all duration-200 active:scale-[0.98]"
                  style={{ background: '#008080', boxShadow: '0 0 20px rgba(0,128,128,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#006666'; e.currentTarget.style.boxShadow = '0 0 32px rgba(0,128,128,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#008080'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,128,128,0.3)' }}
                >
                  <UserPlus size={14} />
                  Get Started
                </Link>
              </>
            )}
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
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(0,128,128,0.1)] bg-[rgba(244,225,193,0.97)] backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                link.href.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-[#0d2b2b]/60 hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)] rounded-xl transition-all font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {Icon && <Icon size={14} />}
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-[#0d2b2b]/60 hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)] rounded-xl transition-all font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {Icon && <Icon size={14} />}
                    {link.label}
                  </Link>
                )
              )
            })}
            <div className="pt-4 border-t border-[rgba(0,128,128,0.1)] flex flex-col gap-2.5 mt-1">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMobileOpen(false) }}
                  className="w-full text-center py-2.5 text-sm font-medium text-[#0d2b2b]/60 border border-[rgba(0,128,128,0.2)] rounded-xl hover:bg-[rgba(0,128,128,0.06)] transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="w-full text-center py-2.5 text-sm font-medium text-[#0d2b2b]/60 border border-[rgba(0,128,128,0.2)] rounded-xl hover:bg-[rgba(0,128,128,0.06)] transition-all flex items-center justify-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LogIn size={14} />
                    Sign In
                  </Link>
                  <Link
                    to="/auth/register"
                    className="w-full text-center py-2.5 text-sm font-semibold text-[#F4E1C1] rounded-xl transition-all flex items-center justify-center gap-2"
                    style={{ background: '#008080' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserPlus size={14} />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
