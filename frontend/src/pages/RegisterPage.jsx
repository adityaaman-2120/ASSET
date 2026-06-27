import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Activity,
  AlertCircle, Loader2, CheckCircle, X,
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

// ─── Password strength engine ─────────────────────────────────────────────────

function getStrength(pw) {
  let score = 0
  const checks = {
    length8:   pw.length >= 8,
    length12:  pw.length >= 12,
    lower:     /[a-z]/.test(pw),
    upper:     /[A-Z]/.test(pw),
    digit:     /\d/.test(pw),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  }
  if (checks.length8)  score++
  if (checks.length12) score++
  if (checks.lower)    score++
  if (checks.upper)    score++
  if (checks.digit)    score++
  if (checks.special)  score++
  return { score, checks }
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
const STRENGTH_COLORS = ['', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', '#00D4FF']

function StrengthBar({ password }) {
  if (!password) return null
  const { score, checks } = getStrength(password)
  const color = STRENGTH_COLORS[score] || STRENGTH_COLORS[1]
  const label = STRENGTH_LABELS[score] || ''

  const rules = [
    { label: 'At least 8 characters', pass: checks.length8 },
    { label: 'Uppercase letter',       pass: checks.upper },
    { label: 'Lowercase letter',       pass: checks.lower },
    { label: 'Number',                 pass: checks.digit },
    { label: 'Special character',      pass: checks.special },
  ]

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5,6].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? color : '#1f2937' }}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: score > 0 ? color : '#4b5563' }}>
          {label}
        </span>
      </div>
      {/* Rule checklist */}
      <div className="grid grid-cols-2 gap-1">
        {rules.map((r) => (
          <div key={r.label} className={`flex items-center gap-1.5 text-[10px] ${r.pass ? 'text-emerald-400' : 'text-slate-600'}`}>
            {r.pass
              ? <CheckCircle className="h-3 w-3 flex-shrink-0" />
              : <X className="h-3 w-3 flex-shrink-0" />
            }
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder, icon: Icon, rightEl, error, onKeyDown }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </label>
      <div className={`relative flex items-center rounded-xl border bg-slate-900/60 transition-all ${
        error
          ? 'border-red-500/50'
          : 'border-slate-800 focus-within:border-[#00D4FF] focus-within:ring-1 focus-within:ring-[#00D4FF]/20'
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
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={
            type === 'email' ? 'email'
            : label.toLowerCase().includes('confirm') ? 'new-password'
            : type === 'password' ? 'new-password'
            : 'name'
          }
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
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 w-[400px] h-[300px] opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse at top left, #00D4FF 0%, transparent 70%)' }} />
      </div>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Activity className="h-6 w-6 text-[#00D4FF]" />
          <span className="font-black text-xl text-white tracking-tight">ASSETS</span>
        </Link>
        <div className="rounded-2xl border border-slate-800 bg-[#111827]/90 backdrop-blur-sm shadow-[0_0_60px_rgba(0,0,0,0.5)] p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Register Page ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function validate() {
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (getStrength(password).score < 2) errs.password = 'Password is too weak'
    if (!confirmPw) errs.confirmPw = 'Please confirm your password'
    else if (password !== confirmPw) errs.confirmPw = 'Passwords do not match'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setError('')
    setLoading(true)
    try {
      // Register → get token
      const { data } = await api.post('/api/v1/auth/register', {
        email,
        password,
        full_name: fullName.trim() || null,
      })
      // Auto-fetch user profile
      const userRes = await api.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, userRes.data)
      navigate('/dashboard')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }))
      } else {
        setError(detail || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleRegister()
  }

  const { score: pwScore } = getStrength(password)
  const pwsMatch = confirmPw && password === confirmPw

  return (
    <AuthCard>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-white">Create your account</h1>
        <p className="text-sm text-slate-400 mt-1">Start building data-driven portfolios for free</p>
      </div>

      <div className="space-y-4">
        {/* Full name */}
        <Field
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: '' })) }}
          placeholder="Aditya Kumar"
          icon={User}
          error={fieldErrors.fullName}
          onKeyDown={handleKeyDown}
        />

        {/* Email */}
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })) }}
          placeholder="you@example.com"
          icon={Mail}
          error={fieldErrors.email}
          onKeyDown={handleKeyDown}
        />

        {/* Password */}
        <div>
          <Field
            label="Password"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })) }}
            placeholder="Min 8 characters"
            icon={Lock}
            error={fieldErrors.password}
            onKeyDown={handleKeyDown}
            rightEl={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {/* Strength bar */}
          {password && <StrengthBar password={password} />}
        </div>

        {/* Confirm password */}
        <div>
          <Field
            label="Confirm Password"
            type={showConfirmPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => { setConfirmPw(e.target.value); setFieldErrors((p) => ({ ...p, confirmPw: '' })) }}
            placeholder="••••••••"
            icon={Lock}
            error={fieldErrors.confirmPw}
            onKeyDown={handleKeyDown}
            rightEl={
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {/* Match indicator */}
          {confirmPw && (
            <p className={`mt-1.5 text-[11px] flex items-center gap-1 ${pwsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
              {pwsMatch
                ? <><CheckCircle className="h-3 w-3" /> Passwords match</>
                : <><X className="h-3 w-3" /> Passwords don't match yet</>
              }
            </p>
          )}
        </div>

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
          onClick={handleRegister}
          disabled={loading || (confirmPw && !pwsMatch)}
          className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-[#0A0E1A] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all cursor-pointer"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
          ) : (
            <>Create Account <ArrowRight className="h-4 w-4" /></>
          )}
        </button>

        {/* Terms note */}
        <p className="text-center text-[10px] text-slate-600">
          By creating an account you agree to use this for personal analysis only.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-[#00D4FF] hover:underline font-semibold">
          Sign in →
        </Link>
      </p>
    </AuthCard>
  )
}
