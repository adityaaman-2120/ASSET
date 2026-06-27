import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LineChart, LayoutDashboard, Compass, ClipboardList, LogOut, LogIn, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Button from './Button'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-[#111827] border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-white">
          <LineChart className="h-6 w-6 text-[#00D4FF]" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            ASSETS
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-1 md:gap-2">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard')
                      ? 'bg-[#00D4FF]/10 text-[#00D4FF]'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  to="/analyze"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith('/analyze')
                      ? 'bg-[#00D4FF]/10 text-[#00D4FF]'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze Goal</span>
                </Link>
                <Link
                  to="/questionnaire"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith('/questionnaire')
                      ? 'bg-[#00D4FF]/10 text-[#00D4FF]'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Preset Questionnaire</span>
                </Link>
              </div>

              <div className="h-5 w-[1px] bg-slate-800" />

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00D4FF] to-[#7C3AED] flex items-center justify-center text-xs font-bold text-[#0A0E1A]">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs text-slate-300 hidden md:inline font-medium max-w-[120px] truncate">
                    {user?.full_name || user?.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/login"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === '/auth/login' ? 'text-[#00D4FF]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link to="/auth/register">
                <Button variant="primary" className="py-1.5">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
