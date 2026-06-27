import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Activity,
  AlertCircle, Loader2, CheckCircle,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

// ─── Reusable input field ─────────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder, icon: Icon, rightEl, error }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </label>
      <div className={`relative flex items-center rounded-xl border bg-slate-900/60 transition-all ${
        error ? 'border-red-500/50' : 'border-slate-800 focus-within:border-[#00D4FF] focus-within:ring-1 focus-within:ring-[#00D4FF]/20'
      }`}>
        {Icon && (
          <span className="pl-4 flex-shrink-0 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'name'}
          className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none"
        />
        {rightEl && <span className="pr-3 flex-shrink-0">{rightEl}</span>}
      </div>
      {error && (
        <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Auth card shell ──────────────────────────────────────────────────────────

function AuthCard({ children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #00D4FF 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse at bottom right, #7C3AED 0%, transparent 70%)' }} />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
          <Activity className="h-6 w-6 text-[#00D4FF]" />
          <span className="font-black text-xl text-white tracking-tight">ASSETS</span>
        </Link>
        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#111827]/90 backdrop-blur-sm shadow-[0_0_60px_rgba(0,0,0,0.5)] p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function validate() {
    const errs = {}
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleLogin() {
    if (!validate()) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      const userRes = await api.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, userRes.data)
      navigate('/dashboard')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 401) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(detail || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <AuthCard>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-white">Welcome back</h1>
        <p className="text-sm text-slate-400 mt-1">Sign in to your ASSETS account</p>
      </div>

      <div className="space-y-4">
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })) }}
          placeholder="you@example.com"
          icon={Mail}
          error={fieldErrors.email}
        />

        <Field
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })) }}
          placeholder="••••••••"
          icon={Lock}
          error={fieldErrors.password}
          rightEl={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              onKeyDown={handleKeyDown}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        {/* Global error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-500/20 rounded-xl text-sm text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleLogin}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-[#0A0E1A] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all cursor-pointer"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
          ) : (
            <>Sign In <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-[#00D4FF] hover:underline font-semibold">
          Create one free →
        </Link>
      </p>
    </AuthCard>
  )
}
