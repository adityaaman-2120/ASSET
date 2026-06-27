import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, Compass, ClipboardList, Wallet, LineChart, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchPortfolios() {
    setError('')
    try {
      const { data } = await api.get('/api/v1/portfolios')
      setPortfolios(data)
    } catch (err) {
      setError('Failed to fetch portfolios. Please reload.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolios()
  }, [])

  const totalCapital = portfolios.reduce((acc, p) => acc + (p.amount || 0), 0)
  const readyPortfolios = portfolios.filter(p => p.status === 'ready')
  const avgReturn = readyPortfolios.length
    ? (readyPortfolios.reduce((acc, p) => acc + (p.constraints?.metrics?.expected_return || p.results?.expected_return || 0), 0) / readyPortfolios.length) * 100
    : 0

  if (loading) {
    return <LoadingSpinner message="Retrieving your portfolios..." />
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Investment Dashboard</h1>
          <p className="text-sm text-slate-400">
            Monitor and orchestrate your machine-learning optimized portfolios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/analyze">
            <Button variant="primary">
              <Compass className="h-4 w-4 mr-1.5" />
              Analyze Goal
            </Button>
          </Link>
          <Link to="/questionnaire">
            <Button variant="secondary">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Questionnaire
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="flex items-center gap-4 bg-slate-900/40">
          <div className="p-3 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF]">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invested Capital</p>
            <h3 className="text-xl font-bold text-white mt-0.5">₹{totalCapital.toLocaleString('en-IN')}</h3>
          </div>
        </Card>
        <Card className="flex items-center gap-4 bg-slate-900/40">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <LineChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Expected Return</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{avgReturn.toFixed(2)}% p.a.</h3>
          </div>
        </Card>
        <Card className="flex items-center gap-4 bg-slate-900/40">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Portfolios</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{portfolios.length}</h3>
          </div>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button type="button" onClick={fetchPortfolios} className="ml-auto flex items-center gap-1 text-[#00D4FF] hover:underline cursor-pointer">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Portfolio Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Your Portfolios</h2>
        {portfolios.length === 0 ? (
          <Card className="text-center py-12 bg-slate-900/20 border-dashed border-slate-800">
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-slate-400 text-sm">
                You haven't generated any optimized portfolios yet. Get started by entering an investment goal or completing the risk questionnaire.
              </p>
              <div className="flex justify-center gap-3">
                <Link to="/analyze">
                  <Button variant="primary">Analyze Investment Goal</Button>
                </Link>
                <Link to="/questionnaire">
                  <Button variant="ghost">Risk Questionnaire</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portfolios.map((portfolio) => {
              const metrics = portfolio.constraints?.metrics || portfolio.results || {}
              const isReady = portfolio.status === 'ready'
              const isProcessing = portfolio.status === 'processing'
              const isPending = portfolio.status === 'pending'

              return (
                <Card
                  key={portfolio.id}
                  className="hover:border-slate-700 transition-all flex flex-col justify-between cursor-pointer"
                  onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-lg truncate max-w-[70%]">
                        {portfolio.name}
                      </h3>
                      <Badge
                        variant={isReady ? 'success' : isProcessing ? 'purple' : 'warning'}
                      >
                        {portfolio.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 min-h-[2rem]">
                      {portfolio.goal_text || 'No goal description.'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Amount</span>
                        <p className="font-semibold text-white text-sm">₹{portfolio.amount?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Risk Profile</span>
                        <p className="font-semibold text-white text-sm capitalize">{portfolio.risk_level}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {isReady ? (
                      <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2.5 rounded-lg text-center text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Return</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {metrics.expected_return ? `${(metrics.expected_return * 100).toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Volatility</span>
                          <span className="font-bold text-slate-300 font-mono">
                            {metrics.volatility ? `${(metrics.volatility * 100).toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Sharpe</span>
                          <span className="font-bold text-[#00D4FF] font-mono">
                            {metrics.sharpe ? metrics.sharpe.toFixed(2) : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Progress</span>
                          <span className="font-mono font-bold text-[#00D4FF]">{portfolio.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] transition-all duration-300"
                            style={{ width: `${portfolio.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
