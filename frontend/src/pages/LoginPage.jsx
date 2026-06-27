import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Mail, Lock } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import Button from '../components/Button'
import Card from '../components/Card'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // API expects UserLogin JSON object
      const { data } = await api.post('/api/v1/auth/login', {
        email: email,
        password: password,
      })

      // Fetch user profile info
      const userRes = await api.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })

      // Save token and user details to store
      login(data.access_token, userRes.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <Card className="border-slate-800 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#00D4FF]/10 flex items-center justify-center text-[#00D4FF] mb-3">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in to ASSETS</h1>
          <p className="text-sm text-slate-400 mt-1">Access your automated portfolios</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none focus:ring-1 focus:ring-[#00D4FF]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none focus:ring-1 focus:ring-[#00D4FF]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full py-2.5"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>

          <p className="text-center text-xs text-slate-400 mt-4">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-[#00D4FF] hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
