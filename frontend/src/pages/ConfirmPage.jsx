import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2, Edit3, ChevronRight, ShieldAlert, Loader2,
  X, Plus, ArrowLeft, Cpu, Clock, Scale, ListFilter,
  Star, Ban, Sparkles,
} from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Badge from '../components/Badge'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

const RISK_OPTIONS = ['low', 'medium', 'high']

const COMMON_SECTORS = [
  'Technology', 'Banking', 'Healthcare', 'FMCG', 'Energy',
  'Infrastructure', 'Pharma', 'Automobile', 'Real Estate',
  'Defense', 'Tobacco', 'Oil & Gas', 'Coal', 'Chemicals',
]

// ─── Chip component ───────────────────────────────────────────────────────────

function SectorChip({ label, onRemove, variant = 'default' }) {
  const colors = {
    excluded: 'bg-red-950/50 border-red-500/30 text-red-300',
    preferred: 'bg-purple-950/50 border-purple-500/30 text-purple-300',
    default: 'bg-slate-800 border-slate-700 text-slate-300',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colors[variant]}`}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(label)}
          className="hover:text-white transition-colors cursor-pointer ml-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

// ─── Add-sector input ─────────────────────────────────────────────────────────

function SectorAdder({ existingChips, onAdd, placeholder }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = COMMON_SECTORS.filter(
    (s) =>
      !existingChips.map((c) => c.toLowerCase()).includes(s.toLowerCase()) &&
      s.toLowerCase().includes(input.toLowerCase())
  )

  function submit(val) {
    const v = (val || input).trim()
    if (v && !existingChips.map((c) => c.toLowerCase()).includes(v.toLowerCase())) {
      onAdd(v)
    }
    setInput('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#00D4FF] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={!input.trim()}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {/* Dropdown suggestions */}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#111827] border border-slate-800 rounded-lg shadow-xl overflow-hidden">
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => submit(s)}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pipeline loading overlay ─────────────────────────────────────────────────

function PipelineOverlay() {
  const stages = [
    { icon: '🔍', label: 'Screening Nifty 500 universe…' },
    { icon: '📊', label: 'Downloading OHLCV data (parallel workers)…' },
    { icon: '⚙️', label: 'Computing RSI, Bollinger Bands, ATR indicators…' },
    { icon: '🤖', label: 'Running XGBoost return forecasts per ticker…' },
    { icon: '⚖️', label: 'Running mean-variance portfolio optimizer…' },
    { icon: '🛡️', label: 'Generating risk critique & SHAP explanations…' },
  ]
  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, stages.length - 1))
    }, 7000)
    const elapsedTimer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => {
      clearInterval(stepTimer)
      clearInterval(elapsedTimer)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E1A]/95 backdrop-blur-md">
      <div className="w-full max-w-sm px-6 space-y-8 text-center">
        {/* Pulsing core icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-[#00D4FF]/5 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-[#00D4FF]/30 animate-pulse" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00D4FF] border-r-[#7C3AED]"
            style={{ animation: 'spin 1.2s linear infinite' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="h-9 w-9 text-[#00D4FF]" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-white">Running Quant Pipeline</h3>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Usually takes 30–60 seconds
            <span className="font-mono text-[#00D4FF] ml-1">{elapsed}s</span>
          </p>
        </div>

        {/* Stage list */}
        <div className="space-y-2.5 text-left">
          {stages.map((s, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <div key={i} className={`flex items-center gap-3 text-xs transition-all duration-500 ${
                done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-700'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] transition-all ${
                  done
                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                    : active
                    ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/40'
                    : 'bg-slate-900 border border-slate-800'
                }`}>
                  {done ? '✓' : active ? <Loader2 className="h-3 w-3 animate-spin text-[#00D4FF]" /> : i + 1}
                </span>
                <span className={active ? 'font-semibold' : ''}>{s.icon} {s.label}</span>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-600 italic">
          Don't close this tab. You'll be redirected automatically when optimization completes.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConfirmPage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const brief = state?.brief
  const rawConstraints = state?.constraints
  const portfolioId = state?.portfolio_id

  // Redirect if landed here without data
  useEffect(() => {
    if (!brief || !rawConstraints || !portfolioId) navigate('/analyze')
  }, [brief, rawConstraints, portfolioId, navigate])

  // ── Editable state (mirrors brief fields) ────────────────────────────────
  const [amount, setAmount] = useState(brief?.amount ?? 0)
  const [riskLevel, setRiskLevel] = useState(brief?.risk_level ?? 'medium')
  const [horizonYears, setHorizonYears] = useState(brief?.horizon_years ?? 3)
  const [excludedSectors, setExcludedSectors] = useState(
    brief?.constraints?.excluded_sectors ?? []
  )
  const [preferredSectors, setPreferredSectors] = useState(
    brief?.constraints?.preferred_sectors ?? []
  )

  // ── UI state ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!brief || !rawConstraints || !portfolioId) return null

  // ── Derived constraint display ────────────────────────────────────────────
  const riskRules = {
    low:    { max_weight: '10%', min_stocks: 15 },
    medium: { max_weight: '15%', min_stocks: 10 },
    high:   { max_weight: '25%', min_stocks: 6 },
  }
  const currentRules = riskRules[riskLevel] || riskRules.medium

  // ── Sector helpers ────────────────────────────────────────────────────────
  function removeExcluded(s) { setExcludedSectors((prev) => prev.filter((x) => x !== s)) }
  function addExcluded(s) {
    setExcludedSectors((prev) => prev.includes(s) ? prev : [...prev, s])
    setPreferredSectors((prev) => prev.filter((x) => x.toLowerCase() !== s.toLowerCase()))
  }
  function removePreferred(s) { setPreferredSectors((prev) => prev.filter((x) => x !== s)) }
  function addPreferred(s) {
    setPreferredSectors((prev) => prev.includes(s) ? prev : [...prev, s])
    setExcludedSectors((prev) => prev.filter((x) => x.toLowerCase() !== s.toLowerCase()))
  }

  // ── Confirm → trigger pipeline ────────────────────────────────────────────
  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      await api.post(`/api/v1/analysis/confirm/${portfolioId}`)
      navigate(`/analyze/result/${portfolioId}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to queue the optimization job. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <PipelineOverlay />}

      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div>
          <Link to="/analyze" className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] hover:underline font-medium mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Goal Input
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Confirm Your Strategy Brief
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Our AI has structured your goal. Review the extracted parameters below, then launch the quant optimizer.
          </p>
        </div>

        {/* AI extracted intent banner */}
        {brief.raw_intent && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#00D4FF]/5 border border-[#00D4FF]/15">
            <Sparkles className="h-4 w-4 text-[#00D4FF] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#00D4FF]/70 mb-0.5">AI-Parsed Intent</p>
              <p className="text-sm text-slate-300 italic">"{brief.raw_intent}"</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Extracted brief (editable) ── */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Extracted Investment Profile
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    editing
                      ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  {editing ? 'Done Editing' : 'Edit Manually'}
                </button>
              </div>

              {/* ── Amount ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    <Scale className="inline h-3 w-3 mr-1" />Investment Amount
                  </label>
                  {editing ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-[#00D4FF] focus:outline-none"
                        step={1000}
                        min={0}
                      />
                    </div>
                  ) : (
                    <p className="text-xl font-black text-white font-mono">{fmtINR(amount)}</p>
                  )}
                </div>

                {/* ── Risk Level ── */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Risk Level
                  </label>
                  {editing ? (
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-[#00D4FF] focus:outline-none capitalize"
                    >
                      {RISK_OPTIONS.map((r) => (
                        <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold capitalize border ${
                      riskLevel === 'low'
                        ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                        : riskLevel === 'high'
                        ? 'bg-red-950/50 border-red-500/30 text-red-300'
                        : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                    }`}>
                      {riskLevel}
                    </span>
                  )}
                </div>

                {/* ── Horizon ── */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    <Clock className="inline h-3 w-3 mr-1" />Time Horizon
                  </label>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={horizonYears}
                        onChange={(e) => setHorizonYears(Number(e.target.value))}
                        min={1} max={30}
                        className="w-24 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-[#00D4FF] focus:outline-none"
                      />
                      <span className="text-slate-400 text-sm">years</span>
                    </div>
                  ) : (
                    <p className="text-xl font-black text-white">{horizonYears} <span className="text-sm font-normal text-slate-400">years</span></p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800" />

              {/* ── Excluded Sectors ── */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  <Ban className="inline h-3 w-3 mr-1 text-red-400" />Excluded Sectors
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {excludedSectors.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">None excluded</span>
                  ) : (
                    excludedSectors.map((s) => (
                      <SectorChip
                        key={s}
                        label={s}
                        variant="excluded"
                        onRemove={editing ? removeExcluded : null}
                      />
                    ))
                  )}
                </div>
                {editing && (
                  <div className="mt-2">
                    <SectorAdder
                      existingChips={excludedSectors}
                      onAdd={addExcluded}
                      placeholder="Add sector to exclude…"
                    />
                  </div>
                )}
              </div>

              {/* ── Preferred Sectors ── */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  <Star className="inline h-3 w-3 mr-1 text-purple-400" />Preferred Sectors
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {preferredSectors.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">None specified</span>
                  ) : (
                    preferredSectors.map((s) => (
                      <SectorChip
                        key={s}
                        label={s}
                        variant="preferred"
                        onRemove={editing ? removePreferred : null}
                      />
                    ))
                  )}
                </div>
                {editing && (
                  <div className="mt-2">
                    <SectorAdder
                      existingChips={preferredSectors}
                      onAdd={addPreferred}
                      placeholder="Add preferred sector…"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── Right: Optimizer constraints + confirm ── */}
          <div className="space-y-4">
            {/* Optimizer rules card */}
            <Card className="space-y-4 border-slate-800/60 bg-slate-950/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ListFilter className="h-4 w-4 text-[#00D4FF]" />
                Optimizer Constraints
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Max single-stock weight</span>
                  <span className="font-mono font-black text-white">{currentRules.max_weight}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Min portfolio stocks</span>
                  <span className="font-mono font-black text-white">{currentRules.min_stocks}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Risk model</span>
                  <span className="font-mono font-black text-white capitalize">{riskLevel}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1.5">Sector exclusions:</span>
                  {excludedSectors.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {excludedSectors.map((s) => (
                        <span key={s} className="text-[10px] bg-red-950/40 border border-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600 italic text-[10px]">None</span>
                  )}
                </div>
              </div>
            </Card>

            {/* What happens next info */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/15 text-xs text-slate-400 space-y-2">
              <p className="font-bold text-purple-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Cpu className="h-3.5 w-3.5" /> What happens next
              </p>
              <ul className="space-y-1 leading-relaxed">
                <li>• Filter Nifty 500 by your constraints</li>
                <li>• Download 1-year OHLCV for each ticker</li>
                <li>• Compute 20+ technical indicators</li>
                <li>• Forecast returns via XGBoost models</li>
                <li>• Solve mean-variance optimizer (Kelly)</li>
                <li>• Generate SHAP rationale & risk critique</li>
              </ul>
              <p className="text-[10px] italic text-slate-600 mt-1">
                Typically 30–60 seconds depending on server load.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-300">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-[#0A0E1A] hover:shadow-[0_0_24px_rgba(0,212,255,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                This Looks Right — Optimize!
                <ChevronRight className="h-4 w-4" />
              </button>
              <Link to="/analyze" className="block">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
                >
                  ← Refine Goal Text
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
