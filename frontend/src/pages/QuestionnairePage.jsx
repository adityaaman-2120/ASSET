import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ArrowLeft, ArrowRight, Check, Sparkles,
  AlertCircle, ChevronRight, Star, Ban,
} from 'lucide-react'
import api from '../lib/api'

// ─── Question definitions (mirrors backend) ───────────────────────────────────

const QUESTIONS = [
  {
    id: 'investment_goal',
    question: 'What is your primary investment goal?',
    subtitle: 'This shapes whether we optimise for growth, income, or stability.',
    type: 'single_choice',
    icons: ['📈', '💸', '🛡️', '📋'],
    options: ['Capital Growth', 'Regular Income', 'Wealth Preservation', 'Tax Saving (ELSS)'],
  },
  {
    id: 'time_horizon',
    question: 'How long can you stay invested?',
    subtitle: 'Longer horizons allow us to take calculated risks for higher compounding.',
    type: 'single_choice',
    icons: ['⚡', '📅', '📆', '🗓️'],
    options: ['Less than 1 year', '1–3 years', '3–5 years', '5+ years'],
  },
  {
    id: 'risk_appetite',
    question: 'Your portfolio drops 20% in one month. What do you do?',
    subtitle: 'Be honest — this is how we calibrate your risk tolerance accurately.',
    type: 'single_choice',
    icons: ['🚨', '📉', '⏳', '🛒'],
    options: [
      'Sell everything immediately',
      'Sell some to cut losses',
      'Hold and wait',
      'Buy more at the dip',
    ],
  },
  {
    id: 'investment_amount',
    question: 'How much are you looking to invest?',
    subtitle: 'This sets our universe size — smaller amounts need tighter concentration.',
    type: 'single_choice',
    icons: ['🪙', '💵', '💰', '💎', '🏦'],
    options: ['Under ₹10,000', '₹10,000–₹50,000', '₹50,000–₹2L', '₹2L–₹10L', 'Above ₹10L'],
  },
  {
    id: 'income_stability',
    question: 'How stable is your monthly income?',
    subtitle: 'Variable income requires a more liquid, lower-risk buffer allocation.',
    type: 'single_choice',
    icons: ['💼', '📊', '🎭', '❌'],
    options: [
      'Very stable (salaried)',
      'Somewhat stable',
      'Variable (freelance/business)',
      'No regular income',
    ],
  },
  {
    id: 'existing_investments',
    question: 'What do you already hold?',
    subtitle: `Select all that apply — we'll balance your overall portfolio, not just this allocation.`,
    type: 'multi_choice',
    icons: ['🏦', '📂', '📈', '🥇', '🏠', '✖️'],
    options: ['FD/RD', 'Mutual Funds', 'Direct Stocks', 'Gold', 'Real Estate', 'None'],
  },
  {
    id: 'sector_preference',
    question: 'Any sectors to prefer or avoid?',
    subtitle: 'Optional — helps personalise your portfolio beyond pure quant signals.',
    type: 'multi_choice_with_avoid',
    prefer_icons: ['💻', '🏦', '💊', '🛒', '🏗️', '⚡'],
    avoid_icons: ['🛡️', '🚬', '🛢️', '🎰', '➖'],
    prefer_options: ['Technology', 'Banking & Finance', 'Healthcare', 'FMCG', 'Infrastructure', 'Energy'],
    avoid_options: ['Defence', 'Tobacco/Alcohol', 'Fossil Fuels', 'Gambling', 'None'],
  },
  {
    id: 'return_expectation',
    question: 'What annual return are you targeting?',
    subtitle: 'Higher targets require accepting higher drawdown risk.',
    type: 'single_choice',
    icons: ['🏖️', '📊', '🚀', '🎯'],
    options: [
      '8–10% (FD-like, safe)',
      '10–15% (moderate growth)',
      '15–25% (aggressive growth)',
      '25%+ (high risk, high reward)',
    ],
  },
  {
    id: 'liquidity_need',
    question: 'How soon might you need this money?',
    subtitle: 'Liquidity needs drive whether we include large-caps vs mid/small-cap holdings.',
    type: 'single_choice',
    icons: ['💧', '⏰', '📅', '🔒'],
    options: ['Anytime (keep liquid)', '6–12 months', '1–3 years', '3+ years (no rush)'],
  },
]

// ─── Pipeline steps (shown during loading) ────────────────────────────────────

const PIPELINE_STEPS = [
  { label: 'Mapping your profile…', threshold: 5 },
  { label: 'Fetching market data…', threshold: 20 },
  { label: 'Running ML predictions…', threshold: 45 },
  { label: 'Optimizing portfolio…', threshold: 70 },
  { label: 'Stress testing…', threshold: 88 },
  { label: 'Generating insights…', threshold: 98 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasAnswer(q, answers) {
  if (q.type === 'single_choice') return !!answers[q.id]
  if (q.type === 'multi_choice') return (answers[q.id] || []).length > 0
  // multi_choice_with_avoid is always skippable (optional)
  return true
}

// ─── Option card atoms ────────────────────────────────────────────────────────

function SingleCard({ icon, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-4 ${
        selected
          ? 'border-[#008080] bg-[rgba(0,128,128,0.08)] shadow-[0_0_16px_rgba(0,128,128,0.12)]'
          : 'border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.65)] hover:border-[rgba(0,128,128,0.4)] hover:bg-[rgba(0,128,128,0.06)]'
      }`}
    >
      <span className="text-2xl flex-shrink-0 w-9 text-center">{icon}</span>
      <span className={`text-sm font-semibold flex-1 leading-snug ${selected ? 'text-[#0d2b2b]' : 'text-[rgba(13,43,43,0.7)] group-hover:text-[#0d2b2b]'}`}>
        {label}
      </span>
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'border-[#008080] bg-[#008080]' : 'border-[rgba(0,128,128,0.3)] group-hover:border-[#008080]'
      }`}>
        {selected && <Check className="h-3 w-3 text-[#F4E1C1] stroke-[3]" />}
      </span>
    </button>
  )
}

function MultiCard({ icon, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-3 ${
        selected
          ? 'border-[#008080] bg-[rgba(0,128,128,0.08)]'
          : 'border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.65)] hover:border-[rgba(0,128,128,0.4)] hover:bg-[rgba(0,128,128,0.06)]'
      }`}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <span className={`text-xs font-semibold flex-1 ${selected ? 'text-[#0d2b2b]' : 'text-[rgba(13,43,43,0.7)] group-hover:text-[#0d2b2b]'}`}>
        {label}
      </span>
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'border-[#008080] bg-[#008080]' : 'border-[rgba(0,128,128,0.3)]'
      }`}>
        {selected && <Check className="h-2.5 w-2.5 text-[#F4E1C1] stroke-[3]" />}
      </span>
    </button>
  )
}

function SectorCard({ icon, label, selected, variant, onClick }) {
  const colors = {
    prefer: selected
      ? 'border-emerald-500 bg-emerald-500/10'
      : 'border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.65)] hover:border-emerald-700 hover:bg-[rgba(0,128,128,0.06)]',
    avoid: selected
      ? 'border-red-500 bg-red-500/10'
      : 'border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.65)] hover:border-red-700 hover:bg-[rgba(0,128,128,0.06)]',
  }
  const checkColors = {
    prefer: selected ? 'border-emerald-500 bg-emerald-500' : 'border-[rgba(0,128,128,0.3)]',
    avoid: selected ? 'border-red-500 bg-red-500' : 'border-[rgba(0,128,128,0.3)]',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-2.5 ${colors[variant]}`}
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      <span className={`text-xs font-semibold flex-1 leading-tight ${selected ? 'text-[#0d2b2b]' : 'text-[rgba(13,43,43,0.5)] group-hover:text-[#0d2b2b]'}`}>
        {label}
      </span>
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checkColors[variant]}`}>
        {selected && <Check className="h-2.5 w-2.5 text-[#F4E1C1] stroke-[3]" />}
      </span>
    </button>
  )
}

// ─── Pipeline Loading Screen ──────────────────────────────────────────────────

function PipelineScreen({ portfolioId, onComplete, onError }) {
  const [completedSteps, setCompletedSteps] = useState([])
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef(null)
  const elapsedRef = useRef(null)

  const poll = useCallback(async () => {
    if (!portfolioId) return
    try {
      const { data } = await api.get(`/api/v1/analysis/status/${portfolioId}`)
      const pct = data.progress || 0
      setProgress(pct)

      // light up steps based on progress thresholds
      const newCompleted = PIPELINE_STEPS
        .map((s, i) => ({ i, threshold: s.threshold }))
        .filter((s) => pct >= s.threshold)
        .map((s) => s.i)
      setCompletedSteps(newCompleted)
      setActiveStep(Math.min(newCompleted.length, PIPELINE_STEPS.length - 1))

      if (data.status === 'ready' && data.portfolio) {
        clearInterval(pollRef.current)
        clearInterval(elapsedRef.current)
        // brief pause so final step "lights up" visibly
        setTimeout(() => onComplete(data.portfolio), 800)
      }
    } catch {
      // silently continue polling on transient errors
    }
  }, [portfolioId, onComplete])

  useEffect(() => {
    // Start polling
    poll()
    pollRef.current = setInterval(poll, 3000)
    elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => {
      clearInterval(pollRef.current)
      clearInterval(elapsedRef.current)
    }
  }, [poll])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(244,225,193,0.98)] backdrop-blur-md">
      <div className="w-full max-w-sm px-8 space-y-8 text-center">

        {/* Animated orb */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[rgba(0,128,128,0.1)] to-[rgba(154,110,58,0.1)] animate-pulse" />
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,128,128,0.12)" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#008080" />
                <stop offset="100%" stopColor="#9a6e3a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[#0d2b2b] font-mono">{progress}%</span>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-[#0d2b2b]">Building Your Portfolio</h3>
          <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">
            Running quant pipeline ·{' '}
            <span className="font-mono text-[#008080]">{elapsed}s elapsed</span>
          </p>
        </div>

        {/* Step checklist */}
        <div className="space-y-3 text-left">
          {PIPELINE_STEPS.map((step, i) => {
            const done = completedSteps.includes(i)
            const active = !done && i === activeStep
            const pending = !done && !active
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                  done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-35'
                }`}
              >
                {/* Status icon */}
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  done
                    ? 'bg-emerald-500 border-emerald-500'
                    : active
                    ? 'border-[#008080] bg-[rgba(0,128,128,0.1)]'
                    : 'border-[rgba(0,128,128,0.2)] bg-[rgba(0,128,128,0.06)]'
                }`}>
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-[#008080] animate-pulse" />
                  ) : null}
                </span>

                <span className={
                  done ? 'text-emerald-400 font-semibold line-through decoration-emerald-700'
                  : active ? 'text-[#0d2b2b] font-bold'
                  : 'text-[rgba(13,43,43,0.35)]'
                }>
                  {step.label}
                </span>

                {done && (
                  <span className="ml-auto text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Done</span>
                )}
                {active && (
                  <span className="ml-auto text-[10px] text-[#008080] font-bold uppercase tracking-wider animate-pulse">
                    Running…
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-[rgba(13,43,43,0.35)] italic">
          Don't close this tab · Usually 30–60 seconds
        </p>
      </div>
    </div>
  )
}

// ─── Answer summary sidebar ───────────────────────────────────────────────────

function AnswerSummary({ questions, answers, currentStep }) {
  const answered = questions.slice(0, currentStep).filter((q) => answers[q.id] !== undefined)
  if (answered.length === 0) return null

  return (
    <div className="hidden lg:block w-56 flex-shrink-0 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)] mb-3">Your Answers</p>
      {answered.map((q) => {
        const val = answers[q.id]
        let display = ''
        if (typeof val === 'string') display = val
        else if (Array.isArray(val)) display = val.join(', ') || 'None selected'
        else if (typeof val === 'object') {
          const p = (val.prefer || []).join(', ')
          const a = (val.avoid || []).join(', ')
          display = [p && `✓ ${p}`, a && `✗ ${a}`].filter(Boolean).join(' · ') || 'Skipped'
        }
        return (
          <div key={q.id} className="p-2.5 rounded-lg bg-[rgba(244,225,193,0.65)] border border-[rgba(0,128,128,0.2)]">
            <p className="text-[9px] text-[rgba(13,43,43,0.5)] font-bold uppercase tracking-wider truncate">{q.id.replace('_', ' ')}</p>
            <p className="text-[10px] text-[rgba(13,43,43,0.7)] mt-0.5 leading-tight line-clamp-2">{display}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main wizard page ─────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('quiz') // 'quiz' | 'submitting' | 'pipeline'
  const [portfolioId, setPortfolioId] = useState(null)
  const [error, setError] = useState('')
  const cardRef = useRef(null)

  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const canProceed = hasAnswer(q, answers)
  const progressPct = Math.round(((step) / QUESTIONS.length) * 100)

  // ── Answer handlers ───────────────────────────────────────────────────────

  function selectSingle(option) {
    setAnswers((prev) => ({ ...prev, [q.id]: option }))
    // Auto-advance after brief delay so selection is visible
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) setStep((s) => s + 1)
    }, 260)
  }

  function toggleMulti(option) {
    const current = answers[q.id] || []
    const updated = current.includes(option)
      ? current.filter((x) => x !== option)
      : [...current, option]
    setAnswers((prev) => ({ ...prev, [q.id]: updated }))
  }

  function toggleSectorPref(type, option) {
    const current = answers[q.id] || { prefer: [], avoid: [] }
    const list = current[type] || []
    const opposite = type === 'prefer' ? 'avoid' : 'prefer'
    const updatedList = list.includes(option)
      ? list.filter((x) => x !== option)
      : [...list, option]
    const oppositeList = (current[opposite] || []).filter((x) => x !== option)
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { [type]: updatedList, [opposite]: oppositeList },
    }))
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  function goNext() {
    if (step < QUESTIONS.length - 1) setStep((s) => s + 1)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError('')
    setPhase('submitting')

    try {
      // Step 1: create the portfolio + kick off analysis
      const { data } = await api.post('/api/v1/questionnaire/analyze', {
        answers,
      })

      // The questionnaire endpoint runs synchronously and returns full portfolio data.
      // Navigate immediately — no polling needed for this path.
      navigate('/questionnaire/result', { state: { portfolio: data } })
    } catch (err) {
      const detail = err?.response?.data?.detail || ''

      // If the pipeline is still running and we have a portfolio_id, switch to polling mode
      if (detail && detail.includes('portfolio_id')) {
        const idMatch = detail.match(/[0-9a-f-]{36}/)
        if (idMatch) {
          setPortfolioId(idMatch[0])
          setPhase('pipeline')
          return
        }
      }

      // Check if we can try polling by getting the portfolio id another way
      // Otherwise show error and return to quiz
      setError(detail || 'Analysis failed. Please try again.')
      setPhase('quiz')
    }
  }

  function handlePipelineComplete(portfolioData) {
    navigate('/questionnaire/result', { state: { portfolio: portfolioData } })
  }

  // ── Render: submitting intermediate screen ────────────────────────────────

  if (phase === 'submitting') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(244,225,193,0.96)] backdrop-blur-md">
        <div className="text-center space-y-6 max-w-xs px-6">
          <div className="relative mx-auto w-20 h-20">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,128,128,0.12)" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#008080" strokeWidth="4" strokeLinecap="round"
                strokeDasharray="276.46" strokeDashoffset="100"
                style={{ animation: 'dash 1.5s ease-in-out infinite' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#008080] animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0d2b2b]">Mapping Your Profile</h3>
            <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">Submitting answers and starting portfolio construction…</p>
          </div>
          <style>{`
            @keyframes dash {
              0%   { stroke-dashoffset: 276; opacity: 0.4; }
              50%  { stroke-dashoffset: 60;  opacity: 1;   }
              100% { stroke-dashoffset: 276; opacity: 0.4; }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // ── Render: pipeline polling screen ──────────────────────────────────────

  if (phase === 'pipeline' && portfolioId) {
    return (
      <PipelineScreen
        portfolioId={portfolioId}
        onComplete={handlePipelineComplete}
        onError={(e) => { setError(e); setPhase('quiz') }}
      />
    )
  }

  // ── Render: quiz ──────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">

      {/* ── Progress header ── */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-2 text-[rgba(13,43,43,0.5)]">
            <ClipboardList className="h-4 w-4 text-[#008080]" />
            <span className="uppercase tracking-wider">Risk Profiler</span>
          </span>
          <span className="font-mono text-[#008080]">
            {step + 1} <span className="text-[rgba(13,43,43,0.35)]">/ {QUESTIONS.length}</span>
          </span>
        </div>

        {/* Progress bar with step dots */}
        <div className="relative">
          <div className="w-full h-1.5 bg-[rgba(0,128,128,0.12)] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(4, ((step + 1) / QUESTIONS.length) * 100)}%`, background: 'linear-gradient(to right, #008080, #9a6e3a)' }}
            />
          </div>
          {/* Step dots */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0">
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { if (i < step || (i === step)) return; if (i <= step) setStep(i) }}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex-shrink-0 ${
                  i < step
                    ? 'bg-[#008080] border-[#008080] cursor-pointer hover:scale-110'
                    : i === step
                    ? 'bg-[#9a6e3a] border-[#9a6e3a] scale-125'
                    : 'bg-[rgba(0,128,128,0.12)] border-[rgba(0,128,128,0.3)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Answer summary sidebar (desktop) */}
        <AnswerSummary questions={QUESTIONS} answers={answers} currentStep={step} />

        {/* ── Main question card ── */}
        <div className="flex-1 min-w-0" ref={cardRef}>
          <div
            key={step}
            className="bg-[rgba(244,225,193,0.65)] border border-[rgba(0,128,128,0.2)] rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
            style={{ animation: 'slideIn 0.25s ease-out' }}
          >
            {/* Question header */}
            <div className="px-6 pt-7 pb-5 border-b border-[rgba(0,128,128,0.15)]">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] text-[#008080] text-xs font-black flex items-center justify-center">
                  {step + 1}
                </span>
                <div>
                  <h2 className="text-xl font-black text-[#0d2b2b] leading-snug">{q.question}</h2>
                  {q.subtitle && (
                    <p className="text-xs text-[rgba(13,43,43,0.5)] mt-1 leading-relaxed">{q.subtitle}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Answer options */}
            <div className="p-6 space-y-3">

              {/* Single choice */}
              {q.type === 'single_choice' && (
                <div className="space-y-2.5">
                  {q.options.map((opt, i) => (
                    <SingleCard
                      key={opt}
                      icon={q.icons?.[i] || '•'}
                      label={opt}
                      selected={answers[q.id] === opt}
                      onClick={() => selectSingle(opt)}
                    />
                  ))}
                </div>
              )}

              {/* Multi choice */}
              {q.type === 'multi_choice' && (
                <>
                  <p className="text-[10px] text-[rgba(13,43,43,0.5)] font-bold uppercase tracking-wider mb-3">
                    Select all that apply
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {q.options.map((opt, i) => (
                      <MultiCard
                        key={opt}
                        icon={q.icons?.[i] || '•'}
                        label={opt}
                        selected={(answers[q.id] || []).includes(opt)}
                        onClick={() => toggleMulti(opt)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Multi choice with avoid */}
              {q.type === 'multi_choice_with_avoid' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Star className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Preferred — include more of these
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {q.prefer_options.map((opt, i) => (
                        <SectorCard
                          key={opt}
                          icon={q.prefer_icons?.[i] || '✓'}
                          label={opt}
                          selected={(answers[q.id]?.prefer || []).includes(opt)}
                          variant="prefer"
                          onClick={() => toggleSectorPref('prefer', opt)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-[rgba(0,128,128,0.15)]" />
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Ban className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                        Avoid — exclude from universe
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {q.avoid_options.map((opt, i) => (
                        <SectorCard
                          key={opt}
                          icon={q.avoid_icons?.[i] || '✗'}
                          label={opt}
                          selected={(answers[q.id]?.avoid || []).includes(opt)}
                          variant="avoid"
                          onClick={() => toggleSectorPref('avoid', opt)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-300 mt-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* ── Footer nav ── */}
            <div className="flex items-center justify-between px-6 pb-6">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[rgba(13,43,43,0.5)] hover:text-[#0d2b2b] hover:bg-[rgba(0,128,128,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex items-center gap-1">
                {QUESTIONS.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === step ? 'bg-[#008080] w-4' : i < step ? 'text-[rgba(13,43,43,0.35)] bg-[rgba(13,43,43,0.35)]' : 'bg-[rgba(0,128,128,0.12)]'
                    }`}
                  />
                ))}
              </div>

              {isLast ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(0,128,128,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  style={{ background: '#008080', color: '#F4E1C1' }}
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze Now
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={q.type === 'single_choice' && !canProceed}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0d2b2b] bg-[rgba(0,128,128,0.08)] hover:bg-[rgba(0,128,128,0.15)] border border-[rgba(0,128,128,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {q.type === 'multi_choice' || q.type === 'multi_choice_with_avoid'
                    ? 'Continue'
                    : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
