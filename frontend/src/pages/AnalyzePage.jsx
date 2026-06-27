import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, HelpCircle, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'

const examples = [
  'I want to invest ₹5 Lakhs for capital growth over 5 years. I am comfortable with high risk, but I want to avoid tobacco and defense stocks.',
  'Invest ₹20,000 monthly for retirement in 15 years. Keep risk medium and focus on ESG friendly energy and healthcare.',
  'I have ₹1 Lakh to invest. I target regular dividend income, want a low-risk strategy, and want to avoid technology companies.',
]

export default function AnalyzePage() {
  const navigate = useNavigate()
  const [goalText, setGoalText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!goalText.trim()) return

    setError('')
    setLoading(false)
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/analysis/analyze', {
        goal_text: goalText,
      })

      // Navigate to /analyze/confirm page, passing data in route state
      navigate('/analyze/confirm', {
        state: {
          brief: data.brief,
          constraints: data.constraints,
          portfolio_id: data.portfolio_id,
        },
      })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to extract investment constraints. Please refine your goal and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Compass className="h-8 w-8 text-[#00D4FF]" />
          Analyze Investment Goal
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Describe your financial goals, risk appetite, constraints, and sector preferences in plain English. Our AI will compile optimizer constraints and structure your brief.
        </p>
      </div>

      <Card className="border-slate-800 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              What is your investment goal?
            </label>
            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              required
              rows={5}
              placeholder="e.g. I want to invest 2 Lakhs. I have a 3-year horizon, prefer high growth, and want to exclude fossil fuel sectors..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-white focus:border-[#00D4FF] focus:outline-none focus:ring-1 focus:ring-[#00D4FF] resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !goalText.trim()}
            variant="primary"
            className="w-full py-3"
          >
            {loading ? 'Compiling brief & constraints…' : 'Structure Investment Brief'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-[#7C3AED]" />
          Example Goal Prompts
        </h3>
        <div className="space-y-3">
          {examples.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setGoalText(example)}
              className="w-full text-left p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/20 text-xs text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
