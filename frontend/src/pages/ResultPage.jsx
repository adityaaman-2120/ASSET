import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, RefreshCw, BarChart2 } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import PortfolioVisualizer from '../components/PortfolioVisualizer'

export default function ResultPage() {
  const { portfolioId } = useParams()
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pollIntervalRef = useRef(null)

  async function checkStatus() {
    try {
      const { data } = await api.get(`/api/v1/analysis/status/${portfolioId}`)
      setStatusData(data)
      setError('')

      if (data.status === 'ready') {
        // Optimization is complete, stop polling
        clearInterval(pollIntervalRef.current)
        setLoading(false)
      } else if (data.portfolio?.results?.error) {
        // Checking for errors
        setError(data.portfolio.results.error)
        clearInterval(pollIntervalRef.current)
        setLoading(false)
      }
    } catch (err) {
      // Don't raise a hard error for transient network check issues during polling, unless we fail on initial load
      if (loading) {
        setError('Failed to fetch portfolio status. Please reload.')
        clearInterval(pollIntervalRef.current)
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // Initial fetch
    checkStatus()

    // Setup polling every 2 seconds
    pollIntervalRef.current = setInterval(checkStatus, 2000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [portfolioId])

  if (loading || (statusData && statusData.status !== 'ready' && !error)) {
    const progress = statusData?.progress || 0
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6">
        <LoadingSpinner
          size="lg"
          message={
            progress <= 5
              ? 'Extracting constraints...'
              : progress < 70
              ? 'Analyzing Nifty stocks and calculating features...'
              : progress < 85
              ? 'Running XGBoost forecasting & optimizing weights...'
              : 'Generating critiques & explainability models...'
          }
        />
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>Optimization Progress</span>
            <span className="font-mono text-[#00D4FF] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 italic">
          This may take a few moments. We download historical bars, run walk-forward XGBoost model validation, solve the quadratic mean-variance optimizer, and query LLM risk controllers.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="border-red-950 bg-red-950/10 text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-white">Optimization Failed</h2>
          <p className="text-xs text-red-300 bg-slate-950/60 p-3 rounded-lg border border-slate-900 leading-relaxed font-mono">
            {error}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/analyze">
              <Button variant="primary">New Goal</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-[#00D4FF]" />
            Strategy Optimized
          </h1>
          <p className="text-sm text-slate-400">
            Strategy allocation ready for deployment. Portfolio ID:{' '}
            <span className="font-mono text-xs text-slate-300">{portfolioId}</span>
          </p>
        </div>
      </div>

      <PortfolioVisualizer data={statusData?.portfolio} />
    </div>
  )
}
