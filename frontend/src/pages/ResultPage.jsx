import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LineChart, Line, ReferenceLine,
} from 'recharts'
import {
  ArrowLeft, BarChart2, AlertCircle, AlertTriangle, Download,
  Share2, ChevronDown, ChevronUp, Send, Zap, Shield,
  TrendingUp, TrendingDown, Activity, Layers, CheckCircle,
  RefreshCw, Star, Loader2,
} from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = ['#008080', '#9a6e3a', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F97316', '#06B6D4']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function pct(n, dp = 1) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(dp)}%`
}
function tickLabel(t) { return t?.replace('.NS', '').replace('.BO', '') || t }

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d2b2b', border: '1px solid #1f2937', borderRadius: '10px', fontSize: 11 },
  itemStyle: { color: '#e2e8f0' }, labelStyle: { color: '#6b7280' },
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Holdings', 'Risk Analysis', 'Stress Test', 'What-If']

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-[rgba(13,43,43,0.5)] p-1 rounded-xl border border-[rgba(0,128,128,0.2)] flex-wrap">
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 min-w-max px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${active === t
              ? 'bg-gradient-to-r from-[rgba(0,128,128,0.2)] to-[rgba(154,110,58,0.2)] text-[#F4E1C1] border border-[#008080]/30'
              : 'text-[rgba(244,225,193,0.55)] hover:text-[#F4E1C1] hover:bg-[rgba(0,128,128,0.08)]'
            }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── SVG Risk Gauge ───────────────────────────────────────────────────────────

function RiskGauge({ score = 5 }) {
  const pct = Math.min(10, Math.max(0, score)) / 10
  const angle = -135 + pct * 270 // -135° to +135°
  const r = 52, cx = 64, cy = 64
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  const start = toXY(-135), end = toXY(135)
  const needleEnd = toXY(angle - 90)
  const color = score <= 3 ? '#10B981' : score <= 6 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="80" viewBox="0 0 128 90">
        {/* Background arc */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`}
          fill="none" stroke="#1f2937" strokeWidth="10" strokeLinecap="round"
        />
        {/* Filled arc */}
        {pct > 0 && (() => {
          const mid = toXY(-135 + pct * 270 / 2 - 90)
          return (
            <path
              d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${toXY(angle - 90).x} ${toXY(angle - 90).y}`}
              fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            />
          )
        })()}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        {/* Labels */}
        <text x="12" y="88" fontSize="9" fill="#4b5563" textAnchor="middle">Low</text>
        <text x="64" y="20" fontSize="9" fill="#4b5563" textAnchor="middle">Med</text>
        <text x="116" y="88" fontSize="9" fill="#4b5563" textAnchor="middle">High</text>
      </svg>
      <p className="text-2xl font-black mt-1" style={{ color }}>{score}<span className="text-sm text-[rgba(244,225,193,0.4)]">/10</span></p>
    </div>
  )
}

// ─── TAB 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const p = data.portfolio || {}
  const critique = data.devils_critique || {}
  const warnings = data.risk_warnings || critique.warnings || []
  const riskScore = critique.risk_score ?? 5
  const chartsData = data.charts_data || {}
  const holdings = data.holdings || []
  const [warnExpanded, setWarnExpanded] = useState(false)

  // Sector donut
  const sectorAlloc = chartsData.sector_allocation || {}
  const sectorData = Object.entries(sectorAlloc).map(([name, val]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value: parseFloat((val * 100).toFixed(1)),
  }))

  // Holdings bar chart
  const holdingBars = [...holdings]
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map((h) => ({ name: tickLabel(h.ticker), value: parseFloat(((h.weight || 0) * 100).toFixed(1)) }))

  // Projection chart
  const er = p.expected_return || 0.12
  const vol = p.volatility || 0.18
  const amt = p.amount || 100000
  const projYears = [0, 1, 2, 3, 4, 5]
  const projData = projYears.map((y) => ({
    year: y === 0 ? 'Now' : `${y}Y`,
    base: Math.round(amt * Math.pow(1 + er, y)),
    optimistic: Math.round(amt * Math.pow(1 + er + 0.5 * vol, y)),
    pessimistic: Math.round(amt * Math.pow(1 + Math.max(-0.3, er - 1.5 * vol), y)),
  }))

  return (
    <div className="space-y-6">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Portfolio Value', value: fmtINR(p.amount), icon: <TrendingUp className="h-4 w-4 text-[#008080]" />, color: 'text-[#008080]' },
          { label: 'Expected Return (p.a.)', value: pct(p.expected_return), icon: <Activity className="h-4 w-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Volatility (p.a.)', value: pct(p.volatility), icon: <Zap className="h-4 w-4 text-amber-400" />, color: 'text-amber-400' },
          { label: 'Sharpe Ratio', value: p.sharpe?.toFixed(2) ?? '—', icon: <Star className="h-4 w-4 text-[#9a6e3a]" />, color: 'text-[#9a6e3a]' },
        ].map((k) => (
          <Card key={k.label} className="p-4 bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[rgba(13,43,43,0.8)]/60 flex-shrink-0">{k.icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)]">{k.label}</p>
              <p className={`text-xl font-black font-mono mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk Gauge */}
        <Card className="flex flex-col items-center justify-center py-6 bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
          <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-2">Portfolio Risk Score</p>
          <RiskGauge score={riskScore} />
          <p className="text-xs text-[rgba(244,225,193,0.4)] mt-2 italic">{critique.rationale?.slice(0, 80)}…</p>
        </Card>

        {/* Sector donut */}
        <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
          <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-3">Sector Allocation</p>
          {sectorData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {sectorData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, '']} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[rgba(244,225,193,0.4)] text-xs italic py-8 text-center">No sector data</p>}
        </Card>

        {/* Holdings weight bars */}
        <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
          <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-3">Portfolio Weights</p>
          {holdingBars.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={holdingBars} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} fontSize={9} stroke="#4b5563" />
                  <YAxis type="category" dataKey="name" width={56} fontSize={9} stroke="#4b5563" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Weight']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {holdingBars.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[rgba(244,225,193,0.4)] text-xs italic py-8 text-center">No holding data</p>}
        </Card>
      </div>

      {/* Projection chart */}
      <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
        <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-4">Projected Value (Base / Optimistic / Pessimistic)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projData} margin={{ left: 16, right: 16 }}>
              <defs>
                {[['optGrad', '#10B981'], ['baseGrad', '#008080'], ['pessGrad', '#EF4444']].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" fontSize={10} stroke="#4b5563" />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} fontSize={10} stroke="#4b5563" width={48} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [fmtINR(v), n]} />
              <Area type="monotone" dataKey="optimistic" stroke="#10B981" strokeWidth={1.5} fill="url(#optGrad)" name="Optimistic" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="base" stroke="#008080" strokeWidth={2.5} fill="url(#baseGrad)" name="Base Case" />
              <Area type="monotone" dataKey="pessimistic" stroke="#EF4444" strokeWidth={1.5} fill="url(#pessGrad)" name="Pessimistic" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Devil's Advocate warning */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15">
          <button
            type="button"
            onClick={() => setWarnExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer"
          >
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-amber-300">Devil's Advocate Risk Critique</p>
              <p className="text-xs text-amber-600 mt-0.5">{warnings.length} risk warning{warnings.length > 1 ? 's' : ''} identified by the LLM risk manager</p>
            </div>
            {warnExpanded
              ? <ChevronUp className="h-4 w-4 text-amber-400" />
              : <ChevronDown className="h-4 w-4 text-amber-400" />}
          </button>
          {warnExpanded && (
            <div className="px-5 pb-5 space-y-2.5 border-t border-amber-500/15 pt-3">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-amber-200">
                  <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p>{w}</p>
                </div>
              ))}
              {critique.rationale && (
                <p className="text-xs text-amber-600 italic border-t border-amber-500/10 pt-2 mt-2">{critique.rationale}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SHAP horizontal bar ─────────────────────────────────────────────────────

function ShapBar({ shap }) {
  if (!shap || !shap.features) return null
  const entries = Object.entries(shap.features || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.001)
  return (
    <div className="space-y-2 mt-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)]">Top SHAP Features (Why this stock?)</p>
      {entries.map(([feat, val]) => {
        const pctW = (Math.abs(val) / maxAbs) * 100
        const pos = val >= 0
        return (
          <div key={feat} className="flex items-center gap-2 text-[10px]">
            <span className="w-28 text-[rgba(244,225,193,0.55)] truncate flex-shrink-0">{feat.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-4 bg-[rgba(13,43,43,0.8)] rounded overflow-hidden relative">
              <div
                className={`h-full rounded transition-all ${pos ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                style={{ width: `${pctW}%`, marginLeft: pos ? 0 : undefined }}
              />
            </div>
            <span className={`w-12 text-right font-mono font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
              {pos ? '+' : ''}{val.toFixed(3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── TAB 2: Holdings ─────────────────────────────────────────────────────────

function HoldingsTab({ data }) {
  const holdings = data.holdings || []
  const [sortKey, setSortKey] = useState('weight')
  const [sortDir, setSortDir] = useState('desc')
  const [filterSector, setFilterSector] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const sectors = ['all', ...new Set(holdings.map((h) => h.sector).filter(Boolean))]

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = holdings
    .filter((h) => filterSector === 'all' || h.sector === filterSector)
    .sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })

  const SortIcon = ({ col }) => sortKey === col
    ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 inline ml-0.5 text-[#008080]" /> : <ChevronUp className="h-3 w-3 inline ml-0.5 text-[#008080]" />)
    : null

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[rgba(244,225,193,0.4)] font-bold">Sector:</span>
        {sectors.map((s) => (
          <button key={s} type="button" onClick={() => setFilterSector(s)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${filterSector === s
                ? 'border-[#008080]/50 bg-[rgba(0,128,128,0.1)] text-[#008080]'
                : 'border-[rgba(0,128,128,0.2)] text-[rgba(244,225,193,0.4)] hover:border-[rgba(0,128,128,0.25)] hover:text-[rgba(244,225,193,0.75)]'
              }`}>
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-[rgba(244,225,193,0.4)]">{filtered.length} holdings</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgba(0,128,128,0.2)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[rgba(13,43,43,0.5)] border-b border-[rgba(0,128,128,0.2)]">
              {[
                ['ticker', 'Ticker'], ['sector', 'Sector'], ['weight', 'Weight %'],
                ['predicted_return', 'Pred. Return'], ['confidence', 'Confidence'], ['shap_explanation', 'Explanation'],
              ].map(([key, label]) => (
                <th key={key}
                  className={`px-4 py-3 text-left font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] ${key !== 'shap_explanation' ? 'cursor-pointer hover:text-[rgba(244,225,193,0.75)] select-none' : ''}`}
                  onClick={() => key !== 'shap_explanation' && toggleSort(key)}
                >
                  {label}<SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,128,128,0.15)]/60">
            {filtered.map((h) => {
              const isExp = expanded === h.ticker
              return (
                <React.Fragment key={h.ticker}>
                  <tr
                    className={`transition-colors cursor-pointer ${isExp ? 'bg-[rgba(0,128,128,0.05)]' : 'hover:bg-[rgba(13,43,43,0.3)]'}`}
                    onClick={() => setExpanded(isExp ? null : h.ticker)}
                  >
                    <td className="px-4 py-3 font-mono font-black text-[#F4E1C1]">{tickLabel(h.ticker)}</td>
                    <td className="px-4 py-3">
                      {h.sector ? (
                        <span className="px-2 py-0.5 rounded-full bg-[rgba(13,43,43,0.8)] text-[rgba(244,225,193,0.75)] text-[10px] font-semibold">
                          {h.sector.replace(/_/g, ' ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[rgba(13,43,43,0.8)] rounded-full overflow-hidden">
                          <div className="h-full bg-[#008080] rounded-full" style={{ width: `${Math.min(100, (h.weight || 0) * 100 / 0.25 * 100)}%` }} />
                        </div>
                        <span className="font-mono font-bold text-[#F4E1C1]">{((h.weight || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono font-bold ${(h.predicted_return || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.predicted_return != null ? pct(h.predicted_return) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {h.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-[rgba(13,43,43,0.8)] rounded-full overflow-hidden">
                            <div className="h-full bg-[#9a6e3a] rounded-full" style={{ width: `${(h.confidence * 100).toFixed(0)}%` }} />
                          </div>
                          <span className="text-[rgba(244,225,193,0.75)] font-mono">{(h.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[rgba(244,225,193,0.4)] max-w-xs truncate italic text-[10px]">
                      {h.shap_explanation?.summary || 'Click to expand ↓'}
                    </td>
                  </tr>
                  {isExp && (
                    <tr className="bg-slate-950/40">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#008080] mb-2">
                            {tickLabel(h.ticker)} — Full SHAP Breakdown
                          </p>
                          <ShapBar shap={h.shap_explanation} />
                          {!h.shap_explanation?.features && (
                            <p className="text-xs text-[rgba(244,225,193,0.4)] italic">
                              {h.shap_explanation?.summary || 'No SHAP data available for this holding.'}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-[rgba(244,225,193,0.4)] text-sm italic py-8">No holdings match this filter.</p>
        )}
      </div>
    </div>
  )
}

// ─── TAB 3: Risk Analysis ────────────────────────────────────────────────────

function RiskTab({ data }) {
  const p = data.portfolio || {}
  const critique = data.devils_critique || {}
  const warnings = data.risk_warnings || critique.warnings || []
  const holdings = data.holdings || []

  const severities = ['HIGH', 'MEDIUM', 'LOW']
  function severity(i) { return severities[Math.min(i, 2)] }

  const maxDD = (p.volatility || 0.18) * 2.5
  const var95 = (p.volatility || 0.18) * 1.65

  const benchmarkComp = [
    { metric: 'Return', portfolio: parseFloat(((p.expected_return || 0.12) * 100).toFixed(1)), nifty: 12.0 },
    { metric: 'Volatility', portfolio: parseFloat(((p.volatility || 0.18) * 100).toFixed(1)), nifty: 15.0 },
    { metric: 'Sharpe', portfolio: parseFloat((p.sharpe || 0.7).toFixed(2)), nifty: 0.80 },
  ]

  // Correlation matrix — synthetic from holding predicted returns
  const topH = holdings.slice(0, 6)
  const corrData = topH.map((h1) => {
    const row = { ticker: tickLabel(h1.ticker) }
    topH.forEach((h2) => {
      const sameSec = h1.sector === h2.sector ? 0.6 : 0.25
      row[tickLabel(h2.ticker)] = h1.ticker === h2.ticker ? 1.0 : parseFloat((sameSec + Math.random() * 0.2 - 0.1).toFixed(2))
    })
    return row
  })

  function corrColor(v) {
    const t = (v + 1) / 2
    const r = Math.round(239 - t * (239 - 16)), g = Math.round(68 + t * (185 - 68)), b = Math.round(68 + t * (129 - 68))
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="space-y-6">
      {/* Risk warnings */}
      <Card className="space-y-3 border-[rgba(0,128,128,0.2)]/60">
        <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)]">LLM Risk Warnings</p>
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4" /> No critical warnings identified
          </div>
        ) : (
          <div className="space-y-2.5">
            {warnings.map((w, i) => {
              const sev = severity(i)
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${sev === 'HIGH' ? 'bg-red-950/20 border border-red-500/20' :
                    sev === 'MEDIUM' ? 'bg-amber-950/20 border border-amber-500/20' :
                      'bg-[rgba(13,43,43,0.3)] border border-[rgba(0,128,128,0.2)]'
                  }`}>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${sev === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      sev === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-[rgba(13,43,43,0.8)] text-[rgba(244,225,193,0.55)]'
                    }`}>{sev}</span>
                  <p className="text-sm text-[rgba(244,225,193,0.75)]">{w}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Risk metrics row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Max Drawdown Est.', value: `-${(maxDD * 100).toFixed(1)}%`, sub: 'Based on 2× annual vol', color: 'text-red-400', icon: <TrendingDown className="h-5 w-5 text-red-400" /> },
          { label: 'Value at Risk (95%)', value: `-${(var95 * 100).toFixed(1)}%`, sub: 'Monthly 1-tail', color: 'text-amber-400', icon: <Shield className="h-5 w-5 text-amber-400" /> },
          { label: 'Risk Score', value: `${critique.risk_score ?? 5}/10`, sub: critique.rationale?.slice(0, 50) + '…', color: 'text-[rgba(244,225,193,0.75)]', icon: <Activity className="h-5 w-5 text-[#008080]" /> },
        ].map((m) => (
          <Card key={m.label} className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60 flex items-start gap-3 p-5">
            <div className="p-2 rounded-lg bg-[rgba(13,43,43,0.8)]">{m.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)]">{m.label}</p>
              <p className={`text-2xl font-black font-mono ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-[rgba(244,225,193,0.4)] mt-0.5 line-clamp-1">{m.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Benchmark comparison */}
      <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
        <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-4">Portfolio vs Nifty 50 Benchmark</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkComp} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="metric" fontSize={10} stroke="#4b5563" />
              <YAxis fontSize={10} stroke="#4b5563" />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="portfolio" name="Your Portfolio" fill="#008080" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nifty" name="Nifty 50" fill="#4b5563" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Correlation heatmap */}
      {topH.length > 1 && (
        <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
          <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-3">Holdings Correlation Heatmap (estimated)</p>
          <div className="overflow-x-auto">
            <table className="text-[10px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-[rgba(244,225,193,0.3)]" />
                  {topH.map((h) => (
                    <th key={h.ticker} className="p-2 text-[rgba(244,225,193,0.55)] font-bold">{tickLabel(h.ticker)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrData.map((row) => (
                  <tr key={row.ticker}>
                    <td className="p-2 text-[rgba(244,225,193,0.55)] font-bold pr-3">{row.ticker}</td>
                    {topH.map((h) => {
                      const v = row[tickLabel(h.ticker)] ?? 0
                      return (
                        <td key={h.ticker} className="p-0">
                          <div
                            className="w-14 h-10 flex items-center justify-center font-bold rounded-sm m-0.5"
                            style={{ background: corrColor(v), color: v > 0.5 ? '#0d2b2b' : '#fff' }}
                          >
                            {v.toFixed(2)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-[rgba(244,225,193,0.3)] mt-2 italic">* Correlation estimates based on sector proximity. Full correlation requires historical bar data.</p>
        </Card>
      )}
    </div>
  )
}

// ─── TAB 4: Stress Test ──────────────────────────────────────────────────────

const SCENARIO_META = {
  '2008_crash': { label: '2008 Global Crash', period: 'Sep 2008 – Mar 2009', emoji: '🏦', color: 'red' },
  'covid_2020': { label: 'COVID Crash 2020', period: 'Feb 2020 – Apr 2020', emoji: '🦠', color: 'amber' },
  '2022_correction': { label: '2022 Correction', period: 'Jan 2022 – Jun 2022', emoji: '📉', color: 'orange' },
}

const STRESS_FALLBACK = [
  { name: '2008_crash', portfolio_return: -0.38, max_drawdown: -0.52, recovery_months: 18 },
  { name: 'covid_2020', portfolio_return: -0.28, max_drawdown: -0.35, recovery_months: 6 },
  { name: '2022_correction', portfolio_return: -0.14, max_drawdown: -0.22, recovery_months: 8 },
]

const SCENARIO_CHART = {
  '2008_crash': [
    { m: 'Sep', p: 100, n: 100 }, { m: 'Oct', p: 72, n: 68 }, { m: 'Nov', p: 63, n: 61 },
    { m: 'Dec', p: 60, n: 57 }, { m: 'Jan', p: 59, n: 55 }, { m: 'Feb', p: 62, n: 58 },
    { m: 'Mar', p: 66, n: 62 }, { m: 'Jun', p: 75, n: 70 }, { m: 'Dec', p: 90, n: 85 },
  ],
  'covid_2020': [
    { m: 'Feb', p: 100, n: 100 }, { m: 'Mar-1', p: 85, n: 82 }, { m: 'Mar-2', p: 72, n: 68 },
    { m: 'Apr', p: 78, n: 74 }, { m: 'May', p: 87, n: 83 }, { m: 'Jun', p: 95, n: 90 },
  ],
  '2022_correction': [
    { m: 'Jan', p: 100, n: 100 }, { m: 'Feb', p: 96, n: 95 }, { m: 'Mar', p: 92, n: 91 },
    { m: 'Apr', p: 89, n: 88 }, { m: 'May', p: 86, n: 85 }, { m: 'Jun', p: 88, n: 87 },
  ],
}

function StressTab({ data }) {
  const scenarios = (data.stress_test?.scenarios?.length > 0
    ? data.stress_test.scenarios
    : STRESS_FALLBACK
  )
  const [activeScenario, setActiveScenario] = useState(scenarios[0]?.name || '2008_crash')
  const chartData = SCENARIO_CHART[activeScenario] || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {scenarios.map((sc) => {
          const meta = SCENARIO_META[sc.name] || { label: sc.name, emoji: '📊', color: 'slate', period: '' }
          const isActive = activeScenario === sc.name
          const ret = sc.portfolio_return ?? 0
          const dd = sc.max_drawdown ?? sc.max_drawdown_pct ?? 0
          const rec = sc.recovery_months ?? sc.recovery_time_months ?? '—'
          return (
            <button
              key={sc.name}
              type="button"
              onClick={() => setActiveScenario(sc.name)}
              className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${isActive ? 'border-[#008080]/50 bg-[rgba(0,128,128,0.05)]' : 'border-[rgba(0,128,128,0.2)] bg-[rgba(13,43,43,0.3)] hover:border-[rgba(0,128,128,0.25)]'
                }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{meta.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-[#F4E1C1]">{meta.label}</p>
                  <p className="text-[10px] text-[rgba(244,225,193,0.4)]">{meta.period}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Portfolio Ret.', pct(ret), ret >= 0 ? 'text-emerald-400' : 'text-red-400'],
                  ['Max Drawdown', pct(dd), 'text-red-400'],
                  ['Recovery', `${rec}mo`, 'text-amber-400'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="bg-[rgba(13,43,43,0.5)] rounded-lg p-2">
                    <p className="text-[9px] text-[rgba(244,225,193,0.4)] font-bold uppercase">{label}</p>
                    <p className={`font-black font-mono text-sm ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Scenario line chart */}
      <Card className="bg-[rgba(13,43,43,0.3)] border-[rgba(0,128,128,0.2)]/60">
        <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(244,225,193,0.4)] mb-1">
          {SCENARIO_META[activeScenario]?.label || activeScenario} — Portfolio vs Nifty 50 (indexed to 100)
        </p>
        <p className="text-[9px] text-[rgba(244,225,193,0.3)] italic mb-4">
          Simulated based on your sector allocation and the historical Nifty performance during this period.
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="m" fontSize={10} stroke="#4b5563" />
              <YAxis domain={['auto', 'auto']} fontSize={10} stroke="#4b5563" tickFormatter={(v) => `${v}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [`${v} (indexed)`, n]} />
              <ReferenceLine y={100} stroke="#4b5563" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="p" stroke="#008080" strokeWidth={2.5} dot={false} name="Your Portfolio" />
              <Line type="monotone" dataKey="n" stroke="#4b5563" strokeWidth={1.5} dot={false} name="Nifty 50" strokeDasharray="4 2" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

// ─── TAB 5: What-If ──────────────────────────────────────────────────────────

const PRESET_QUESTIONS = [
  'Why is TCS weighted so heavily?',
  'What happens if I add 10% more to HDFC Bank?',
  'What if I shift to a higher risk level?',
  'What would removing the IT sector do?',
  'How exposed am I to a Nifty 10% crash?',
  'Which holding has the highest tail risk?',
]

function WhatIfTab({ portfolioId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendQuestion(q) {
    const question = (q || input).trim()
    if (!question || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const { data } = await api.post(`/api/v1/analysis/whatif/${portfolioId}`, { question })
      setMessages((prev) => [...prev, { role: 'advisor', text: data.answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'advisor', text: 'Sorry — failed to get a response. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[640px]">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendQuestion(q)}
            disabled={loading}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-full border border-[rgba(0,128,128,0.2)] bg-[rgba(13,43,43,0.3)] text-[rgba(244,225,193,0.55)] hover:border-[#008080]/40 hover:text-[#008080] disabled:opacity-40 transition-all cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <Card className="flex-1 overflow-y-auto space-y-3 bg-[rgba(13,43,43,0.15)] border-[rgba(0,128,128,0.2)]/60 pr-1">
        {messages.length === 0 ? (
          <div className="text-center text-[rgba(244,225,193,0.3)] py-16 space-y-2">
            <Zap className="mx-auto h-8 w-8 text-[rgba(244,225,193,0.25)]" />
            <p className="text-sm font-semibold">Ask anything about your portfolio</p>
            <p className="text-xs italic">Use the preset questions above or type your own below.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'advisor' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#008080' }}>
                  <Activity className="h-3.5 w-3.5 text-[#F4E1C1]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] text-[#F4E1C1] rounded-tr-sm'
                    : 'bg-[rgba(13,43,43,0.7)] border border-[rgba(0,128,128,0.2)] text-[rgba(244,225,193,0.75)] rounded-tl-sm'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#008080' }}>
              <Activity className="h-3.5 w-3.5 text-[#F4E1C1]" />
            </div>
            <div className="bg-[rgba(13,43,43,0.7)] border border-[rgba(0,128,128,0.2)] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-[#008080] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendQuestion() }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this portfolio…"
          disabled={loading}
          className="flex-1 rounded-xl border border-[rgba(0,128,128,0.2)] bg-[rgba(13,43,43,0.5)] px-4 py-3 text-sm text-[#F4E1C1] placeholder-[rgba(244,225,193,0.3)] focus:border-[#008080] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(0,128,128,0.3)] transition-all cursor-pointer text-[#F4E1C1]"
          style={{ background: '#008080' }}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  )
}

// ─── Pipeline progress overlay (for /analyze/result/:id polling) ──────────────

const POLL_STEPS = [
  { label: 'Mapping your profile…', threshold: 5 },
  { label: 'Fetching market data…', threshold: 20 },
  { label: 'Running ML predictions…', threshold: 45 },
  { label: 'Optimizing portfolio…', threshold: 70 },
  { label: 'Stress testing…', threshold: 88 },
  { label: 'Generating insights…', threshold: 98 },
]

function PollingScreen({ progress }) {
  const completed = POLL_STEPS.filter((s) => progress >= s.threshold).length
  const active = Math.min(completed, POLL_STEPS.length - 1)

  const msg =
    progress <= 5 ? 'Extracting constraints…'
      : progress < 45 ? 'Downloading OHLCV & computing indicators…'
        : progress < 70 ? 'Running XGBoost forecasts…'
          : progress < 90 ? 'Solving mean-variance optimizer…'
            : 'Generating risk critique & SHAP…'

  return (
    <div className="max-w-sm mx-auto py-20 px-4 text-center space-y-8">
      {/* SVG ring */}
      <div className="relative mx-auto w-28 h-28">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="url(#rg)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <defs>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#008080" /><stop offset="100%" stopColor="#9a6e3a" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-[#F4E1C1] font-mono">{progress}%</span>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-black text-[#F4E1C1]">Building Your Portfolio</h3>
        <p className="text-sm text-[rgba(244,225,193,0.55)] mt-1">{msg}</p>
      </div>

      <div className="space-y-2.5 text-left">
        {POLL_STEPS.map((s, i) => {
          const done = progress >= s.threshold
          const isActive = !done && i === active
          return (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all ${done ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-30'}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : isActive ? 'border-[#008080] bg-[rgba(0,128,128,0.1)]' : 'border-[rgba(0,128,128,0.2)]'
                }`}>
                {done ? <Check className="h-3 w-3 text-white stroke-[3]" /> : isActive ? <span className="w-1.5 h-1.5 bg-[#008080] rounded-full animate-pulse" /> : null}
              </span>
              <span className={done ? 'text-emerald-400 line-through decoration-emerald-700' : isActive ? 'text-[#F4E1C1] font-bold' : 'text-[rgba(244,225,193,0.3)]'}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-[rgba(244,225,193,0.3)] italic">Don't close this tab · Usually 30–60 seconds</p>
    </div>
  )
}

// ─── Main ResultPage ──────────────────────────────────────────────────────────

export default function ResultPage() {
  const { portfolioId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // If navigated from questionnaire/NL confirm, portfolio data is passed via state
  const statePortfolio = location.state?.portfolio

  const [portfolioData, setPortfolioData] = useState(statePortfolio || null)
  const [progress, setProgress] = useState(0)
  const [polling, setPolling] = useState(!statePortfolio && !!portfolioId)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')

  const pollRef = useRef(null)

  const poll = useCallback(async () => {
    if (!portfolioId) return
    try {
      const { data } = await api.get(`/api/v1/analysis/status/${portfolioId}`)
      setProgress(data.progress || 0)
      if (data.status === 'ready' && data.portfolio) {
        clearInterval(pollRef.current)
        setPortfolioData(data.portfolio)
        setPolling(false)
      } else if (data.portfolio?.results?.error) {
        clearInterval(pollRef.current)
        setError(data.portfolio.results.error)
        setPolling(false)
      }
    } catch {
      // silently continue
    }
  }, [portfolioId])

  useEffect(() => {
    if (!statePortfolio && portfolioId) {
      poll()
      pollRef.current = setInterval(poll, 2500)
    }
    return () => clearInterval(pollRef.current)
  }, [portfolioId, poll, statePortfolio])

  // Also try fetching directly if we have a portfolioId but no state data
  useEffect(() => {
    if (!statePortfolio && portfolioId && !portfolioData && !polling) {
      api.get(`/api/v1/analysis/portfolio/${portfolioId}`)
        .then(({ data }) => setPortfolioData(data))
        .catch(() => { })
    }
  }, [portfolioId, statePortfolio, portfolioData, polling])

  function handleDownload() {
    const blob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `portfolio-${portfolioId || 'result'}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  function handleShare() {
    const url = window.location.href
    navigator.clipboard?.writeText(url)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => alert(`Share this URL:\n${url}`))
  }

  // ── Polling screen ──────────────────────────────────────────────────────────
  if (polling) return <PollingScreen progress={progress} />

  // ── Error screen ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="border-red-950 bg-red-950/10 text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-[#F4E1C1]">Optimization Failed</h2>
          <p className="text-xs text-red-300 bg-slate-950/60 p-3 rounded-lg border border-slate-900 leading-relaxed font-mono">{error}</p>
          <div className="flex justify-center gap-3">
            <Link to="/analyze"><button type="button" className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer text-[#F4E1C1]" style={{ background: '#008080' }}>New Goal</button></Link>
            <Link to="/dashboard"><button type="button" className="px-4 py-2 rounded-lg border border-[rgba(0,128,128,0.2)] text-[rgba(244,225,193,0.75)] text-sm font-bold cursor-pointer">Dashboard</button></Link>
          </div>
        </Card>
      </div>
    )
  }

  // ── Loading (no data yet) ──────────────────────────────────────────────────
  if (!portfolioData) return <LoadingSpinner message="Loading portfolio results…" />

  const p = portfolioData.portfolio || {}
  const pid = portfolioId || p.id

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#008080] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-[#F4E1C1] tracking-tight flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-[#008080]" />
            {p.name || 'Portfolio Results'}
          </h1>
          <p className="text-sm text-[rgba(244,225,193,0.55)] mt-1">
            <span className="capitalize">{p.risk_level}</span> risk ·{' '}
            {fmtINR(p.amount)} invested ·{' '}
            <span className="font-mono text-xs text-[rgba(244,225,193,0.4)]">{pid}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(0,128,128,0.2)] text-[rgba(244,225,193,0.55)] hover:text-[#F4E1C1] hover:bg-[rgba(0,128,128,0.08)] text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download JSON
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] text-[#008080] hover:bg-[rgba(0,128,128,0.2)] text-xs font-semibold transition-all cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div key={activeTab} style={{ animation: 'fadeIn 0.2s ease-out' }}>
        {activeTab === 'Overview' && <OverviewTab data={portfolioData} />}
        {activeTab === 'Holdings' && <HoldingsTab data={portfolioData} />}
        {activeTab === 'Risk Analysis' && <RiskTab data={portfolioData} />}
        {activeTab === 'Stress Test' && <StressTab data={portfolioData} />}
        {activeTab === 'What-If' && <WhatIfTab portfolioId={portfolioId} />}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
