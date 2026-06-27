import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ShieldAlert, CheckCircle2, ChevronRight, Ban, Settings } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

export default function ConfirmPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const brief = state?.brief
  const constraints = state?.constraints
  const portfolioId = state?.portfolio_id

  useEffect(() => {
    if (!brief || !constraints || !portfolioId) {
      navigate('/analyze')
    }
  }, [brief, constraints, portfolioId, navigate])

  if (!brief || !constraints || !portfolioId) {
    return null
  }

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      await api.post(`/api/v1/analysis/confirm/${portfolioId}`)
      // Redirect to the result page where progress tracking will occur
      navigate(`/analyze/result/${portfolioId}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to queue the optimization job.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Confirm Portfolio Strategy</h1>
        <p className="text-sm text-slate-400 mt-2">
          Verify the AI-structured brief and optimizer constraints below before triggering the full quant optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Investment Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-xl text-sm">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Allocation Target</span>
                <span className="text-white font-bold text-base">₹{brief.amount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Risk Level Target</span>
                <span className="capitalize text-white font-bold text-base">{brief.risk_level}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Time Horizon</span>
                <span className="text-white font-bold text-base">{brief.horizon_years} Years</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Primary Theme</span>
                <span className="text-white font-bold text-base">
                  {brief.constraints?.esg_only ? 'ESG Only' : 'Custom Growth'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider mb-1.5">Goal Description</span>
            <p className="text-slate-300 bg-slate-900/20 border border-slate-800 rounded-lg p-3 text-sm italic">
              "{brief.raw_intent}"
            </p>
          </div>

          {brief.constraints?.preferred_sectors?.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider mb-2">Preferred Sectors</span>
              <div className="flex flex-wrap gap-2">
                {brief.constraints.preferred_sectors.map((sec, idx) => (
                  <Badge key={idx} variant="purple">
                    {sec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-slate-900 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-[#00D4FF]" />
              Optimizer Constraints
            </h3>
            
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Max Asset Weight:</span>
                <span className="font-bold font-mono">{(constraints.max_weight * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Min Portfolio Nodes:</span>
                <span className="font-bold font-mono">{constraints.min_stocks}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2">
                <span className="text-slate-500 block mb-1">Excluded Sectors:</span>
                {constraints.excluded_sectors?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {constraints.excluded_sectors.map((sec, idx) => (
                      <Badge key={idx} variant="danger">
                        {sec}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic font-mono">None</span>
                )}
              </div>
            </div>
          </Card>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              variant="primary"
              className="w-full py-3"
            >
              {loading ? 'Queueing Optimizer…' : 'Optimize Portfolio'}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Link to="/analyze">
              <Button variant="ghost" className="w-full py-2.5">
                Refine Goal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
