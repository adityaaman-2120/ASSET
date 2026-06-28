import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Activity, TrendingUp, TrendingDown, Compass, ClipboardList,
  Wallet, BarChart3, AlertCircle, X, ZapOff, Zap, Clock,
  ChevronRight, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVE_TICKER_SYMBOLS = [
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','ICICIBANK.NS','INFY.NS',
  'SBIN.NS','BHARTIARTL.NS','BAJFINANCE.NS','KOTAKBANK.NS','LT.NS',
  'HCLTECH.NS','AXISBANK.NS','MARUTI.NS','SUNPHARMA.NS','TITAN.NS',
  'WIPRO.NS','ONGC.NS','NTPC.NS','TATAMOTORS.NS','TATASTEEL.NS',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)
}

function fmtPct(n, decimals = 2) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}

function tickerLabel(t) {
  return t.replace('.NS', '').replace('.BO', '').replace('&', '')
}

// colour on a red→white→green gradient for heatmap cells
function heatColor(pct) {
  if (pct == null) return 'rgba(0,128,128,0.08)'
  const clamped = Math.max(-5, Math.min(5, pct))
  if (clamped >= 0) {
    const t = clamped / 5
    return `rgba(16, 185, 129, ${0.15 + t * 0.25})`
  } else {
    const t = Math.abs(clamped) / 5
    return `rgba(239, 68, 68, ${0.15 + t * 0.25})`
  }
}

function isMarketHour() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const h = ist.getHours(), m = ist.getMinutes()
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  const mins = h * 60 + m
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MarketStatusBar({ status }) {
  const [clockIST, setClockIST] = useState('')

  useEffect(() => {
    const tick = () => {
      setClockIST(
        new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!status) {
    return (
      <div className="w-full bg-[rgba(244,225,193,0.65)] border border-[rgba(0,128,128,0.2)] rounded-xl px-5 py-3 flex items-center gap-3 text-[rgba(13,43,43,0.5)] text-sm">
        <Activity className="h-4 w-4 animate-pulse" />
        Loading market status…
      </div>
    )
  }

  const open = status.is_open
  const nextOpen = status.next_open
    ? new Date(status.next_open).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', hour12: true,
        weekday: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className={`w-full rounded-xl border px-5 py-3 flex flex-wrap items-center gap-4 text-sm font-medium ${
      open
        ? 'bg-emerald-950/20 border-emerald-500/20'
        : 'bg-[rgba(244,225,193,0.4)] border-[rgba(0,128,128,0.2)]'
    }`}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {open ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </span>
            <span className="text-emerald-400 font-bold tracking-wider uppercase text-xs">NSE OPEN</span>
          </>
        ) : (
          <>
            <ZapOff className="h-4 w-4 text-[rgba(13,43,43,0.5)]" />
            <span className="text-[rgba(13,43,43,0.5)] font-bold tracking-wider uppercase text-xs">NSE CLOSED</span>
          </>
        )}
      </div>

      <div className="h-4 w-px bg-[rgba(0,128,128,0.25)]" />

      {/* IST Clock */}
      <div className="flex items-center gap-1.5 text-[rgba(13,43,43,0.75)]">
        <Clock className="h-3.5 w-3.5 text-[rgba(13,43,43,0.5)]" />
        <span className="font-mono">{clockIST} IST</span>
      </div>

      <div className="h-4 w-px bg-[rgba(0,128,128,0.25)]" />

      {/* Session label */}
      <span className="text-[rgba(13,43,43,0.5)] capitalize">
        Session: <span className="text-[#0d2b2b] font-semibold">{status.session}</span>
      </span>

      {!open && nextOpen && (
        <>
          <div className="h-4 w-px bg-[rgba(0,128,128,0.25)]" />
          <span className="text-[rgba(13,43,43,0.5)]">
            Next open: <span className="text-[#008080] font-semibold">{nextOpen}</span>
          </span>
        </>
      )}

      <div className="ml-auto">
        <Badge variant={open ? 'success' : 'gray'}>
          {open ? 'LIVE' : 'Offline'}
        </Badge>
      </div>
    </div>
  )
}

function MoverCard({ mover }) {
  const up = mover.direction === 'up'
  return (
    <div className={`flex-shrink-0 w-44 rounded-xl border p-4 space-y-2 transition-all hover:scale-[1.02] shadow-sm ${
      up
        ? 'border-emerald-600/30 bg-emerald-500/15'
        : 'border-red-600/30 bg-red-500/15'
    }`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-black text-[#0d2b2b] text-sm">{tickerLabel(mover.ticker)}</span>
        {up
          ? <ArrowUpRight className="h-4 w-4 text-emerald-700 font-bold" />
          : <ArrowDownRight className="h-4 w-4 text-red-700 font-bold" />
        }
      </div>
      <div className="font-mono font-black text-lg text-[#0d2b2b]">
        {fmtINR(mover.last_price)}
      </div>
      <div className={`text-sm font-black font-mono ${up ? 'text-emerald-700' : 'text-red-700'}`}>
        {fmtPct(mover.change_pct)}
      </div>
      {mover.volume_spike != null && (
        <div className="flex items-center gap-1 text-[11px] text-[#0d2b2b] font-semibold">
          <Zap className="h-3.5 w-3.5 text-[#78350f] fill-[#78350f]" />
          <span>Vol spike: <span className="text-[#78350f] font-black">{mover.volume_spike}×</span></span>
        </div>
      )}
    </div>
  )
}

function HeatmapCell({ mover, onClick }) {
  const pct = mover?.change_pct ?? null
  const bg = heatColor(pct)
  const up = pct != null && pct >= 0
  return (
    <button
      type="button"
      onClick={() => onClick(mover)}
      title={`${mover.ticker}: ${fmtPct(pct)}`}
      className="rounded-lg p-2 text-center cursor-pointer transition-all hover:ring-1 hover:ring-[rgba(0,128,128,0.4)] hover:scale-105 active:scale-95 border border-[rgba(0,128,128,0.15)] shadow-sm"
      style={{ backgroundColor: bg }}
    >
      <div className="text-[10px] font-black text-[#0d2b2b] leading-tight truncate">
        {tickerLabel(mover.ticker)}
      </div>
      <div className={`text-[10px] font-mono font-black mt-0.5 ${up ? 'text-emerald-800' : 'text-red-800'}`}>
        {fmtPct(pct, 1)}
      </div>
    </button>
  )
}

function HistoryModal({ ticker, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['history', ticker],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/market/history/${ticker}?period=1y`)
      return data.rows || []
    },
    enabled: !!ticker,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[rgba(244,225,193,0.98)] border border-[rgba(0,128,128,0.2)] rounded-2xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(0,128,128,0.2)]">
          <div>
            <h3 className="text-lg font-bold text-[#0d2b2b] font-mono">{tickerLabel(ticker)}</h3>
            <p className="text-xs text-[rgba(13,43,43,0.5)]">1-Year Price History</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[rgba(13,43,43,0.5)] hover:text-[#0d2b2b] hover:bg-[rgba(0,128,128,0.08)] rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chart */}
        <div className="p-5">
          {isLoading && <LoadingSpinner message={`Loading ${tickerLabel(ticker)} history…`} />}
          {isError && (
            <div className="text-center py-8 text-red-400 text-sm">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              Failed to load price history.
            </div>
          )}
          {data && data.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ left: 10, right: 10 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008080" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,128,0.15)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(13,43,43,0.35)"
                    fontSize={10}
                    tickFormatter={(d) => d?.slice(5)}  // show MM-DD
                    interval={Math.floor(data.length / 6)}
                  />
                  <YAxis
                    stroke="rgba(13,43,43,0.35)"
                    fontSize={10}
                    width={68}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'rgba(244,225,193,0.97)', border: '1px solid rgba(0,128,128,0.2)', color: '#0d2b2b', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#008080' }}
                    labelStyle={{ color: 'rgba(13,43,43,0.5)', fontSize: 11 }}
                    formatter={(v) => [fmtINR(v), 'Close']}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#008080"
                    strokeWidth={2}
                    fill="url(#histGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LiveTickerBand({ symbols }) {
  const { data } = useQuery({
    queryKey: ['live-ticker-band'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        symbols.map((s) => api.get(`/api/v1/market/price/${s}`).then((r) => r.data))
      )
      return results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  if (!data || data.length === 0) {
    return (
      <div className="h-10 bg-[rgba(0,128,128,0.08)] border border-[rgba(0,128,128,0.15)] rounded-xl flex items-center px-4 text-xs text-[rgba(13,43,43,0.5)] italic">
        Loading live ticker…
      </div>
    )
  }

  // duplicate for seamless loop
  const items = [...data, ...data]

  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(0,128,128,0.15)] bg-[rgba(0,128,128,0.08)] h-10">
      <div
        className="flex items-center h-full gap-8 px-4"
        style={{
          animation: 'ticker-scroll 60s linear infinite',
          width: 'max-content',
        }}
      >
        {items.map((item, idx) => {
          const up = item.change_pct >= 0
          return (
            <span key={`${item.ticker}-${idx}`} className="flex items-center gap-2 text-xs flex-shrink-0">
              <span className="font-mono font-bold text-[#0d2b2b]">{tickerLabel(item.ticker)}</span>
              <span className="font-mono text-[rgba(13,43,43,0.75)]">{fmtINR(item.price)}</span>
              <span className={`font-mono font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPct(item.change_pct)}
              </span>
              <span className="text-[rgba(13,43,43,0.35)]">│</span>
            </span>
          )
        })}
      </div>
      {/* Fades */}
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[rgba(0,128,128,0.08)] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[rgba(0,128,128,0.08)] to-transparent pointer-events-none" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const [selectedTicker, setSelectedTicker] = useState(null)
  const moversScrollRef = useRef(null)

  const marketOpen = isMarketHour()

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: marketStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['market-status'],
    queryFn: async () => (await api.get('/api/v1/market/status')).data,
    refetchInterval: marketOpen ? 30_000 : 60_000,
    staleTime: 20_000,
  })

  const { data: topMovers = [], isLoading: moversLoading } = useQuery({
    queryKey: ['top-movers'],
    queryFn: async () => (await api.get('/api/v1/market/top-movers?n=10')).data,
    refetchInterval: marketOpen ? 60_000 : false,
    staleTime: 55_000,
  })

  const { data: heatmapData = [], isLoading: heatLoading } = useQuery({
    queryKey: ['nifty-heatmap'],
    queryFn: async () => (await api.get('/api/v1/market/top-movers?n=50')).data,
    refetchInterval: marketOpen ? 60_000 : false,
    staleTime: 55_000,
  })

  const {
    data: portfolios = [],
    isLoading: portfoliosLoading,
    isError: portfoliosError,
    refetch: refetchPortfolios,
  } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => (await api.get('/api/v1/portfolios')).data,
    refetchInterval: 60_000,
    staleTime: 55_000,
  })

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalCapital = portfolios.reduce((s, p) => s + (p.amount || 0), 0)
  const readyPortfolios = portfolios.filter((p) => p.status === 'ready')
  const avgReturn = readyPortfolios.length
    ? readyPortfolios.reduce((s, p) => {
        const r = p.results?.metrics?.expected_return
          ?? p.results?.expected_return
          ?? 0
        return s + r
      }, 0) / readyPortfolios.length
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Price History Modal */}
      {selectedTicker && (
        <HistoryModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="space-y-6 py-6">

        {/* ── 1. Market Status Bar ── */}
        <MarketStatusBar status={marketStatus} />

        {/* ── Summary metrics row ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4 bg-[rgba(244,225,193,0.65)] border-[rgba(0,128,128,0.2)]">
            <div className="p-3 rounded-lg bg-[rgba(0,128,128,0.1)] text-[#008080]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Total Invested</p>
              <p className="text-xl font-black text-[#0d2b2b] font-mono">{fmtINR(totalCapital)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 bg-[rgba(244,225,193,0.65)] border-[rgba(0,128,128,0.2)]">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Avg Expected Return</p>
              <p className="text-xl font-black text-[#0d2b2b] font-mono">{(avgReturn * 100).toFixed(2)}% p.a.</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 bg-[rgba(244,225,193,0.65)] border-[rgba(0,128,128,0.2)]">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Active Portfolios</p>
              <p className="text-xl font-black text-[#0d2b2b] font-mono">{portfolios.length}</p>
            </div>
          </Card>
        </div>

        {/* ── 2. Top Movers ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-[#0d2b2b] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#008080]" />
              Top Movers — Nifty 50
            </h2>
            {!marketOpen && (
              <span className="text-xs font-black uppercase tracking-wider text-[#78350f] bg-amber-500/20 border border-amber-600/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <ZapOff className="h-3.5 w-3.5 text-[#78350f]" />
                Last Session Data
              </span>
            )}
          </div>

          {moversLoading ? (
            <LoadingSpinner size="sm" message="Fetching movers…" />
          ) : (
            <div
              ref={moversScrollRef}
              className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-[rgba(0,128,128,0.2)] scrollbar-track-transparent"
            >
              {topMovers.map((m) => (
                <MoverCard key={m.ticker} mover={m} />
              ))}
              {topMovers.length === 0 && (
                <p className="text-[rgba(13,43,43,0.5)] text-sm italic py-6">No mover data available.</p>
              )}
            </div>
          )}
        </section>

        {/* ── 3. Nifty 50 Heatmap ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-[#0d2b2b] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#9a6e3a]" />
              Nifty 50 Heatmap
            </h2>
            <span className="text-[10px] text-[rgba(13,43,43,0.5)] italic">Click any cell to view history chart</span>
          </div>

          {heatLoading ? (
            <LoadingSpinner size="sm" message="Rendering heatmap…" />
          ) : (
            <Card className="p-4 border-[rgba(0,128,128,0.2)]">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {heatmapData.map((mover) => (
                  <HeatmapCell
                    key={mover.ticker}
                    mover={mover}
                    onClick={(m) => setSelectedTicker(m.ticker)}
                  />
                ))}
                {heatmapData.length === 0 && (
                  <div className="col-span-10 text-center text-[rgba(13,43,43,0.5)] text-sm italic py-8">
                    Heatmap data unavailable.
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-3 text-[10px] text-[rgba(13,43,43,0.5)]">
                <span>Negative</span>
                <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-red-600/80 via-slate-700 to-emerald-600/80" />
                <span>Positive</span>
              </div>
            </Card>
          )}
        </section>

        {/* ── 4. Quick Actions ── */}
        <section>
          <h2 className="text-xl font-bold text-[#0d2b2b] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link to="/analyze" className="group">
              <div className="relative overflow-hidden rounded-xl border border-[rgba(0,128,128,0.2)] bg-gradient-to-br from-[rgba(0,128,128,0.1)] to-transparent p-6 hover:border-[#008080]/50 transition-all hover:shadow-[0_0_24px_rgba(0,128,128,0.12)]">
                <Compass className="h-8 w-8 text-[#008080] mb-3" />
                <h3 className="text-lg font-bold text-[#0d2b2b]">Analyze My Portfolio Goal</h3>
                <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">Describe your goals in plain English. Our LLM extracts constraints and an XGBoost optimizer generates the ideal allocation.</p>
                <div className="mt-4 flex items-center gap-1 text-[#008080] text-sm font-semibold">
                  Get Started <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
            <Link to="/questionnaire" className="group">
              <div className="relative overflow-hidden rounded-xl border border-[#9a6e3a]/20 bg-gradient-to-br from-[#9a6e3a]/10 to-transparent p-6 hover:border-[#9a6e3a]/50 transition-all hover:shadow-[0_0_24px_rgba(154,110,58,0.12)]">
                <ClipboardList className="h-8 w-8 text-[#9a6e3a] mb-3" />
                <h3 className="text-lg font-bold text-[#0d2b2b]">Use Risk Questionnaire</h3>
                <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">Answer 9 guided questions about your goals, appetite, and timeline. Our risk profiler builds your optimal strategy.</p>
                <div className="mt-4 flex items-center gap-1 text-[#9a6e3a] text-sm font-semibold">
                  Start Quiz <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── 5. My Portfolios ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-[#0d2b2b]">My Portfolios</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchPortfolios()}
                className="p-1.5 text-[rgba(13,43,43,0.5)] hover:text-[#0d2b2b] hover:bg-[rgba(0,128,128,0.08)] rounded-lg transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <Link to="/analyze">
                <Button variant="primary" className="py-1.5 text-xs">
                  + New Analysis
                </Button>
              </Link>
            </div>
          </div>

          {portfoliosLoading ? (
            <LoadingSpinner size="sm" message="Loading portfolios…" />
          ) : portfoliosError ? (
            <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" />
              Failed to load portfolios. Please refresh.
            </div>
          ) : portfolios.length === 0 ? (
            <Card className="text-center py-12 border-dashed border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.4)]">
              <p className="text-[rgba(13,43,43,0.5)] text-sm mb-4">No portfolios yet. Create your first optimized strategy.</p>
              <div className="flex justify-center gap-3">
                <Link to="/analyze"><Button variant="primary">Analyze Goal</Button></Link>
                <Link to="/questionnaire"><Button variant="ghost">Questionnaire</Button></Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((p) => {
                const metrics = p.results?.metrics || p.results || {}
                const isReady = p.status === 'ready'
                const createdAt = new Date(p.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <Card
                    key={p.id}
                    className="hover:border-[rgba(0,128,128,0.25)] transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => navigate(`/portfolio/${p.id}`)}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-[#0d2b2b] text-base leading-tight max-w-[70%] truncate">{p.name}</h3>
                        <Badge variant={isReady ? 'success' : p.status === 'processing' ? 'purple' : 'warning'}>
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-[rgba(13,43,43,0.5)] line-clamp-2 min-h-[2rem]">
                        {p.goal_text || 'No goal text.'}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[rgba(0,128,128,0.15)] pt-3">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.5)] block">Amount</span>
                          <span className="text-sm font-bold text-[#0d2b2b] font-mono">{fmtINR(p.amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.5)] block">Created</span>
                          <span className="text-sm font-medium text-[rgba(13,43,43,0.75)]">{createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {isReady && (
                      <div className="grid grid-cols-3 gap-2 bg-[rgba(0,128,128,0.06)] mt-4 p-2.5 rounded-lg text-center text-xs">
                        <div>
                          <span className="text-[9px] font-black text-[rgba(13,43,43,0.5)] uppercase tracking-wider block">Return</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {metrics.expected_return != null ? fmtPct(metrics.expected_return * 100, 1) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-[rgba(13,43,43,0.5)] uppercase tracking-wider block">Risk</span>
                          <span className="font-bold text-[rgba(13,43,43,0.75)] capitalize text-[11px]">{p.risk_level}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-[rgba(13,43,43,0.5)] uppercase tracking-wider block">Sharpe</span>
                          <span className="font-bold text-[#008080] font-mono">
                            {metrics.sharpe != null ? metrics.sharpe.toFixed(2) : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isReady && p.progress > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-[rgba(13,43,43,0.5)]">
                          <span>Progress</span>
                          <span className="font-mono font-bold text-[#008080]">{p.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[rgba(0,128,128,0.08)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#008080] to-[#9a6e3a] transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 6. Live Price Ticker Band ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[rgba(13,43,43,0.5)] mb-2 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Live Market Prices
          </h2>
          <LiveTickerBand symbols={LIVE_TICKER_SYMBOLS} />
        </section>

      </div>
    </>
  )
}
