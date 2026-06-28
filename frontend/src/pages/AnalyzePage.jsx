import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, Sparkles, ArrowRight, AlertCircle, Loader2,
  ChevronRight, FileText,
} from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'

// ─── Example prompts ─────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  {
    label: 'Capital Growth',
    icon: '📈',
    text: 'Invest ₹5 Lakhs over 5 years for maximum capital growth. High risk is fine. Avoid fossil fuels and tobacco.',
  },
  {
    label: 'Retirement Income',
    icon: '🏖️',
    text: 'Building retirement corpus — ₹50,000 per month SIP for 15 years. Medium risk, prefer healthcare and FMCG. ESG only.',
  },
  {
    label: 'Conservative',
    icon: '🛡️',
    text: '₹2 Lakh, low risk, 3-year horizon. I want regular dividend income. Avoid defence and gambling sectors.',
  },
  {
    label: 'Aggressive Growth',
    icon: '🚀',
    text: 'I have ₹10 Lakh. 7 years. High risk. Focus on technology, fintech, and pharma. Maximise Sharpe ratio.',
  },
  {
    label: 'ELSS / Tax Saving',
    icon: '💰',
    text: '₹1.5 Lakh into ELSS for tax saving under 80C. 3-year lock-in, medium risk, no specific sector preference.',
  },
  {
    label: 'Short-term',
    icon: '⚡',
    text: 'Park ₹25,000 for 12 months. Very low risk — capital preservation is my #1 priority. No equity.',
  },
]

const MAX_CHARS = 500

// ─── Loading overlay ──────────────────────────────────────────────────────────

function AnalyzingOverlay() {
  const steps = [
    { label: 'Parsing natural language goal…', delay: 0 },
    { label: 'Running LLM brief extraction (Groq / Llama)…', delay: 1200 },
    { label: 'Compiling optimizer constraints…', delay: 2400 },
    { label: 'Creating portfolio record…', delay: 3200 },
  ]
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    const timers = steps.map((s, i) =>
      setTimeout(() => setStep(i), s.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(244,225,193,0.96)] backdrop-blur-sm">
      <div className="text-center space-y-6 max-w-sm px-6">
        {/* Animated ring */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-[rgba(0,128,128,0.2)]" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#008080]"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-[#008080]" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#0d2b2b]">Structuring your brief…</h3>
          <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">Our AI is reading your goal and compiling optimizer constraints</p>
        </div>

        {/* Step indicators */}
        <div className="space-y-2 text-left">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-500 ${
              i <= step ? 'text-[#0d2b2b]' : 'text-[rgba(13,43,43,0.35)]'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                i < step
                  ? 'bg-emerald-500'
                  : i === step
                  ? 'bg-[#008080] animate-pulse'
                  : 'bg-[rgba(0,128,128,0.06)]'
              }`}>
                {i < step ? (
                  <span className="text-[8px] font-black">✓</span>
                ) : i === step ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : null}
              </span>
              <span className={i === step ? 'text-[#008080] font-semibold' : ''}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const navigate = useNavigate()
  const textareaRef = useRef(null)
  const [goalText, setGoalText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const charCount = goalText.length
  const charRemaining = MAX_CHARS - charCount
  const isOverLimit = charCount > MAX_CHARS
  const isEmpty = !goalText.trim()

  function fillExample(text) {
    setGoalText(text)
    textareaRef.current?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isEmpty || isOverLimit) return

    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/analysis/analyze', {
        goal_text: goalText,
      })
      navigate('/analyze/confirm', {
        state: {
          brief: data.brief,
          constraints: data.constraints,
          portfolio_id: data.portfolio_id,
          goal_text: goalText,
        },
      })
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'Failed to extract investment constraints. Try rephrasing — include amount, risk level, and time horizon.'
      )
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <AnalyzingOverlay />}

      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] mb-2">
            <Compass className="h-7 w-7 text-[#008080]" />
          </div>
          <h1 className="text-4xl font-black text-[#0d2b2b] tracking-tight">
            Describe Your Goal
          </h1>
          <p className="text-[rgba(13,43,43,0.5)] text-sm max-w-md mx-auto leading-relaxed">
            Write your investment goal in plain English. Mention your budget, risk appetite, time horizon, and any sectors to avoid or prefer.
          </p>
        </div>

        {/* Main input card */}
        <Card className="border-[rgba(0,128,128,0.2)] shadow-2xl shadow-black/40 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)] mb-2.5">
                Your Investment Goal
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  rows={5}
                  placeholder={'Describe your investment goal… e.g. "Grow ₹1L over 2 years, medium risk, avoid fossil fuels"'}
                  className={`w-full rounded-xl border bg-[rgba(244,225,193,0.5)] p-4 text-sm text-[#0d2b2b] placeholder-[rgba(13,43,43,0.35)] focus:outline-none focus:ring-1 resize-none transition-colors leading-relaxed ${
                    isOverLimit
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-[rgba(0,128,128,0.2)] focus:border-[#008080] focus:ring-[rgba(0,128,128,0.2)]'
                  }`}
                />
                {/* Character counter */}
                <div className={`absolute bottom-3 right-3 text-[10px] font-mono font-bold tabular-nums ${
                  isOverLimit
                    ? 'text-red-600 font-black'
                    : charRemaining < 80
                    ? 'text-[#78350f] font-black'
                    : 'text-[rgba(13,43,43,0.55)]'
                }`}>
                  {charCount}/{MAX_CHARS}
                </div>
              </div>
              {isOverLimit && (
                <p className="mt-1.5 text-[11px] text-red-600 font-bold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {Math.abs(charRemaining)} characters over limit. Please shorten your goal.
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-500/20 rounded-xl text-sm text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isEmpty || isOverLimit}
              className={`group w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                loading || isEmpty || isOverLimit
                  ? 'bg-[rgba(0,128,128,0.06)] text-[rgba(13,43,43,0.35)] cursor-not-allowed'
                  : 'hover:shadow-[0_0_24px_rgba(0,128,128,0.3)] hover:scale-[1.01] active:scale-[0.99]'
              }`}
              style={!(loading || isEmpty || isOverLimit) ? { background: '#008080', color: '#F4E1C1' } : {}}
            >
              <Sparkles className="h-4 w-4" />
              Structure Investment Brief
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* What the AI extracts */}
          <div className="border-t border-[rgba(0,128,128,0.15)] pt-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)] mb-2.5">
              What our AI extracts from your text
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['💰', 'Amount', '₹1L, ₹50K…'],
                ['⚖️', 'Risk Level', 'low / medium / high'],
                ['📅', 'Horizon', '1–30 years'],
                ['🚫', 'Exclusions', 'fossil fuels, tobacco…'],
              ].map(([icon, label, hint]) => (
                <div key={label} className="bg-[rgba(0,128,128,0.06)] rounded-lg p-2.5 text-center">
                  <span className="text-base">{icon}</span>
                  <p className="text-[10px] font-bold text-[#0d2b2b] mt-0.5">{label}</p>
                  <p className="text-[9px] text-[rgba(13,43,43,0.5)] mt-0.5">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Example prompts */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)] flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[#9a6e3a]" />
            Quick-fill examples — click any chip to load
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => fillExample(p.text)}
                className="group text-left p-3.5 rounded-xl border border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.65)] hover:bg-[rgba(0,128,128,0.06)] hover:border-[rgba(0,128,128,0.4)] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{p.icon}</span>
                  <span className="text-xs font-bold text-[#0d2b2b] group-hover:text-[#008080] transition-colors">
                    {p.label}
                  </span>
                  <ChevronRight className="h-3 w-3 text-[rgba(13,43,43,0.35)] ml-auto group-hover:text-[#008080] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-[rgba(13,43,43,0.5)] leading-snug line-clamp-2">
                  {p.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
