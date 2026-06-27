import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { useInvestorStore } from '../store/investorStore'
import { api } from '../api/client'

function fmtInr(n) {
  if (n == null || isNaN(n)) return '₹0'
  return '₹' + Number(n.toFixed(0)).toLocaleString('en-IN')
}
function fmtPct(n, plus = true) {
  if (n == null || isNaN(n)) return '—'
  return `${plus && n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function timeAgo(date) {
  if (!date) return ''
  const s = Math.floor((Date.now() - date) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

const SIGNAL_COLOR = { BUY: '#16a34a', HOLD: '#008080', SELL: '#dc2626' }
const SIGNAL_BG    = { BUY: 'rgba(22,163,74,0.1)', HOLD: 'rgba(0,128,128,0.08)', SELL: 'rgba(220,38,38,0.08)' }
const DONUT_COLORS = ['#008080','#006666','#9a6e3a','#c49a60','#004d4d','#7a5530','#00a0a0','#e0b87a']
const INSIGHT_STYLE = {
  warning:  { icon: '⚠', bg: 'rgba(154,110,58,0.07)',  border: 'rgba(154,110,58,0.22)', label: '#9a6e3a' },
  positive: { icon: '↑', bg: 'rgba(22,163,74,0.06)',   border: 'rgba(22,163,74,0.22)',  label: '#16a34a' },
  negative: { icon: '↓', bg: 'rgba(220,38,38,0.06)',   border: 'rgba(220,38,38,0.2)',   label: '#dc2626' },
  tip:      { icon: '✦', bg: 'rgba(0,128,128,0.05)',   border: 'rgba(0,128,128,0.18)', label: '#008080' },
}

function KpiCard({ label, value, sub, positive, neutral }) {
  const col = neutral ? '#008080' : positive ? '#16a34a' : '#dc2626'
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
      <p className="text-xs uppercase mb-1" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.13em' }}>{label}</p>
      <p className="font-bold leading-none" style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.25rem', color: '#0d2b2b' }}>{value}</p>
      {sub != null && (
        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: neutral ? 'rgba(0,128,128,0.08)' : positive ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: col, fontFamily: 'Space Mono,monospace' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function SignalBadge({ signal }) {
  const s = signal || 'HOLD'
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: SIGNAL_BG[s] || SIGNAL_BG.HOLD, color: SIGNAL_COLOR[s] || SIGNAL_COLOR.HOLD, fontFamily: 'Space Mono,monospace' }}>
      {s}
    </span>
  )
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null
  const pts = data.map((p, i) => ({ i, p }))
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="p" stroke={color || '#008080'} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function RiskMeter({ volatility }) {
  const v = volatility || 15
  const pct = Math.min(Math.max(v * 3, 2), 98)
  const label = v < 10 ? 'Low Risk' : v < 20 ? 'Medium Risk' : 'High Risk'
  const color = v < 10 ? '#16a34a' : v < 20 ? '#9a6e3a' : '#dc2626'
  return (
    <div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right,#16a34a,#9a6e3a,#dc2626)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow"
          style={{ left: `${pct}%`, background: '#F4E1C1', border: '2px solid #0d2b2b', transform: 'translate(-50%,-50%)' }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>Low</span>
        <span className="text-[10px] font-semibold" style={{ fontFamily: 'Space Mono,monospace', color }}>{label}</span>
        <span className="text-[10px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>High</span>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'holdings',  label: 'Holdings'         },
  { id: 'signals',   label: 'ML Signals'       },
  { id: 'insights',  label: 'AI Insights'      },
  { id: 'scenarios', label: 'Scenarios'        },
  { id: 'devil',     label: "Devil's Advocate" },
  { id: 'whatif',    label: 'What-If'          },
]

export default function Dashboard() {
  const navigate    = useNavigate()
  const portfolio   = useInvestorStore(s => s.portfolio)
  const profile     = useInvestorStore(s => s.profile)
  const regime      = useInvestorStore(s => s.regime)

  const [livePrices,   setLivePrices]   = useState({})
  const [insights,     setInsights]     = useState([])
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shares,       setShares]       = useState({})
  const [activeTab,    setActiveTab]    = useState('holdings')
  const [stress,        setStress]        = useState(null)
  const [stressLoading, setStressLoading] = useState(false)
  const [devil,         setDevil]         = useState(null)
  const [devilLoading,  setDevilLoading]  = useState(false)
  const [whatIf,        setWhatIf]        = useState(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [wiExtraCapital, setWiExtraCapital] = useState(0)
  const [wiRemoveTicker, setWiRemoveTicker] = useState('')

  const allocations     = portfolio?.allocations || []
  const tickers         = allocations.map(a => a.ticker)
  const preloadInsights = portfolio?.insights || []

  useEffect(() => { if (preloadInsights.length) setInsights(preloadInsights) }, [])

  const computeCurrentValue = useCallback(() => {
    let total = 0
    allocations.forEach(a => {
      const sh    = shares[a.ticker] || 0
      const price = livePrices[a.ticker]?.current_price || 0
      total += sh * price
    })
    return total || allocations.reduce((s, a) => s + a.amount, 0)
  }, [allocations, livePrices, shares])

  const fetchLivePrices = useCallback(async () => {
    if (!tickers.length) return
    try {
      const res = await api.get('/api/live-prices', { params: { tickers: tickers.join(',') } })
      const map = {}
      res.data.forEach(item => { map[item.ticker] = item })
      setLivePrices(map)
      setLastUpdated(Date.now())
      setShares(prev => {
        const next = { ...prev }
        allocations.forEach(a => {
          if (!prev[a.ticker] && map[a.ticker]?.current_price)
            next[a.ticker] = a.amount / map[a.ticker].current_price
        })
        return next
      })
    } catch (e) { console.error('Live prices failed', e) }
  }, [tickers.join(',')])

  const fetchInsights = useCallback(async () => {
    if (!tickers.length || insights.length) return
    try {
      const currentValue = computeCurrentValue()
      const invested     = allocations.reduce((s, a) => s + a.amount, 0)
      const portItems    = allocations.map(a => ({
        ticker: a.ticker, name: a.name,
        signal: a.signal || 'HOLD', confidence: a.confidence || 0,
        change_pct_1d: a.change_pct_1d || 0,
        rsi_value: a.indicators?.rsi_14 || 50,
        composite_score: a.confidence || 0,
        weight_pct: a.weight_pct,
      }))
      const res = await api.post('/api/generate-insights', { portfolio: portItems, portfolio_value: currentValue, invested_capital: invested })
      setInsights(res.data.insights || [])
    } catch (e) { console.error('Insights failed', e) }
  }, [allocations, livePrices, shares, insights.length])

  const fetchStress = useCallback(async () => {
    if (!allocations.length || stress || stressLoading) return
    setStressLoading(true)
    try {
      const res = await api.post('/api/stress-test', { allocations })
      setStress(res.data)
    } catch (e) { console.error('Stress test failed', e) }
    finally { setStressLoading(false) }
  }, [allocations, stress, stressLoading])

  const fetchDevil = useCallback(async () => {
    if (!allocations.length || devil || devilLoading) return
    setDevilLoading(true)
    try {
      const res = await api.post('/api/devils-advocate', {
        allocations,
        regime: regime?.regime || 'SIDEWAYS',
      })
      setDevil(res.data)
    } catch (e) { console.error('Devils advocate failed', e) }
    finally { setDevilLoading(false) }
  }, [allocations, devil, devilLoading, regime])

  const runWhatIf = useCallback(async () => {
    if (!allocations.length || whatIfLoading) return
    setWhatIfLoading(true)
    setWhatIf(null)
    try {
      const baseTickers = allocations.map(a => a.ticker)
      const capital = parseFloat(profile?.capital) || allocations.reduce((s, a) => s + (a.amount || 0), 0)
      const riskLevel = profile?.risk
        ? (profile.risk.toLowerCase().includes('low') || profile.risk.includes('15%') ? 'low'
          : profile.risk.toLowerCase().includes('high') ? 'high' : 'medium')
        : 'medium'
      const res = await api.post('/api/what-if', {
        base_tickers: baseTickers,
        capital,
        risk_level: riskLevel,
        regime: regime?.regime || 'SIDEWAYS',
        remove_tickers: wiRemoveTicker ? [wiRemoveTicker] : [],
        add_tickers: [],
        extra_capital: wiExtraCapital || 0,
      })
      setWhatIf(res.data)
    } catch (e) { console.error('What-if failed', e) }
    finally { setWhatIfLoading(false) }
  }, [allocations, profile, regime, wiRemoveTicker, wiExtraCapital, whatIfLoading])

  useEffect(() => {
    if (activeTab === 'scenarios') fetchStress()
    if (activeTab === 'devil') fetchDevil()
  }, [activeTab])

  useEffect(() => {
    if (!portfolio) { navigate('/'); return }
    fetchLivePrices().then(() => { fetchInsights(); fetchStress(); })
    const iv = setInterval(fetchLivePrices, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLivePrices()
    setIsRefreshing(false)
  }

  if (!portfolio) return null

  const currentValue    = computeCurrentValue()
  const investedCapital = allocations.reduce((s, a) => s + a.amount, 0)
  const totalReturn     = investedCapital > 0 ? ((currentValue - investedCapital) / investedCapital) * 100 : 0

  // Single formula for today's P&L — same source used for both header and per-holding cards.
  // Cash Reserve is flat (no price movement), skipped via ticker === 'CASH' guard.
  // Uses prev_close when available (exact); falls back to change_pct_1d approximation.
  const todayPnL = allocations.reduce((tot, a) => {
    if (a.ticker === 'CASH') return tot
    const sh = shares[a.ticker] || 0
    if (sh === 0) return tot
    const lp = livePrices[a.ticker]
    if (!lp) return tot
    if (lp.current_price != null && lp.prev_close != null) {
      tot += sh * (lp.current_price - lp.prev_close)
    } else if (lp.current_price != null && lp.change_pct_1d != null) {
      // fallback: prev_close = current / (1 + pct/100)
      const prevClose = lp.current_price / (1 + lp.change_pct_1d / 100)
      tot += sh * (lp.current_price - prevClose)
    }
    return tot
  }, 0)

  // portfolio value % badge = today's move / (value at yesterday's close)
  const yesterdayValue  = currentValue - todayPnL
  const todayValuePct   = yesterdayValue > 0 ? (todayPnL / yesterdayValue) * 100 : 0
  const livePricesReady = Object.keys(livePrices).length > 0

  const buyCount  = allocations.filter(a => a.signal === 'BUY').length
  const holdCount = allocations.filter(a => !a.signal || a.signal === 'HOLD').length
  const sellCount = allocations.filter(a => a.signal === 'SELL').length

  const scenario  = portfolio.scenario || {}
  const expReturn = portfolio.expected_annual_return
  const vol       = portfolio.portfolio_volatility
  const sharpe    = portfolio.sharpe_ratio

  return (
    <div className="min-h-screen" style={{ background: '#F4E1C1' }}>
      {/* grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.022]" style={{
        backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
      }} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex items-center justify-between"
        style={{ background: 'rgba(244,225,193,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,128,128,0.12)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#008080,#006666)' }}>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, color: '#F4E1C1', fontSize: '12px' }}>A</span>
          </div>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#0d2b2b', fontSize: '15px', letterSpacing: '0.04em' }}>ASSETS</span>
          <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full"
            style={{ fontFamily: 'Space Mono,monospace', color: '#008080', background: 'rgba(0,128,128,0.08)', border: '1px solid rgba(0,128,128,0.15)' }}>
            {profile?.investorType || 'Investor'}
          </span>
        </div>
        <p className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>{timeAgo(lastUpdated)}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="px-3 py-1.5 text-xs rounded-xl transition-all"
            style={{ border: '1.5px solid rgba(0,128,128,0.2)', color: 'rgba(13,43,43,0.55)', fontFamily: 'Space Grotesk,sans-serif' }}>
            ← Back
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            style={{ background: '#008080', color: '#F4E1C1', fontFamily: 'Space Grotesk,sans-serif' }}
            onMouseEnter={e => { if (!isRefreshing) e.currentTarget.style.background = '#006666' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}>
            {isRefreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

        {/* ── Regime Banner ── */}
        {regime && (() => {
          const r = regime.regime || 'SIDEWAYS'
          const REGIME_META = {
            BULL:            { emoji: '📈', label: 'Market is Going Up',      sublabel: '(Bullish Regime)',          color: '#16a34a', bg: 'rgba(22,163,74,0.07)',   border: 'rgba(22,163,74,0.22)'  },
            BEAR:            { emoji: '🐻', label: 'Market is Falling',        sublabel: '(Bearish Regime)',          color: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.22)' },
            HIGH_VOLATILITY: { emoji: '⚡', label: 'Market is Very Shaky',     sublabel: '(High Volatility Regime)',  color: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.22)' },
            SIDEWAYS:        { emoji: '↔',  label: 'Market is Moving Sideways', sublabel: '(Range-Bound Regime)',     color: '#008080', bg: 'rgba(0,128,128,0.07)',  border: 'rgba(0,128,128,0.22)' },
          }
          const meta = REGIME_META[r] || REGIME_META.SIDEWAYS
          const rawConf = regime.confidence != null ? regime.confidence : 0
          // HMMs on financial data naturally produce near-100% posterior probabilities
          // (the Viterbi path is deterministic once a state is entered).
          // We show a 3-bar signal strength instead of the raw number to avoid misleading users.
          const signalBars = rawConf >= 0.9 ? 3 : rawConf >= 0.6 ? 2 : 1
          const signalLabel = signalBars === 3 ? 'Strong signal' : signalBars === 2 ? 'Moderate signal' : 'Weak signal'
          return (
            <div className="rounded-2xl px-5 py-4"
              style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
              {/* top row */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{meta.emoji}</span>
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="font-bold" style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.15rem', color: meta.color }}>
                        {meta.label}
                      </p>
                      <p className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                        {meta.sublabel}
                      </p>
                    </div>
                    <p className="mt-1 text-sm" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.7)' }}>
                      {regime.action}
                    </p>
                    <p className="mt-1 text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)' }}>
                      Reads 2 years of NIFTY 50 daily data — not today's movement. One green day doesn't change the overall market phase.
                    </p>
                  </div>
                </div>
                {/* stats pills */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(13,43,43,0.05)', border: '1px solid rgba(13,43,43,0.08)' }}>
                    <p className="text-[10px] uppercase mb-1" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.1em' }}>
                      Signal strength
                    </p>
                    <div className="flex items-center gap-1 justify-center mb-0.5">
                      {[1,2,3].map(b => (
                        <div key={b} style={{
                          width: 10, height: b === 1 ? 8 : b === 2 ? 12 : 16,
                          borderRadius: 2,
                          background: b <= signalBars ? meta.color : 'rgba(13,43,43,0.12)',
                        }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ fontFamily: 'Space Mono,monospace', color: meta.color }}>
                      {signalLabel}
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(13,43,43,0.05)', border: '1px solid rgba(13,43,43,0.08)' }}>
                    <p className="text-[10px] uppercase mb-0.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.1em' }}>Last checked</p>
                    <p className="font-bold text-sm" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.55)' }}>
                      {regime.as_of || '—'}
                    </p>
                  </div>
                </div>
              </div>
              {/* how it changed your portfolio */}
              <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: `1px solid ${meta.border}` }}>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: 'Space Mono,monospace' }}>
                  AI ADAPTED YOUR PORTFOLIO
                </span>
                <p className="text-xs" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.5)' }}>
                  {(r === 'BEAR' || r === 'HIGH_VOLATILITY')
                    ? 'Your stock weights were reduced to 70% and 30% was moved to cash (Cash Reserve) to protect your money.'
                    : r === 'BULL'
                    ? 'Your full capital is invested in stocks to capture the upward trend (maximise risk-adjusted return).'
                    : 'Standard Markowitz allocation applied — balanced mix across your chosen sectors.'}
                </p>
              </div>
            </div>
          )
        })()}

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Portfolio Value"
            value={fmtInr(currentValue)}
            sub={livePricesReady ? fmtPct(todayValuePct) : '—'}
            positive={todayValuePct >= 0} />
          <KpiCard label="Today's P&L"
            value={livePricesReady ? fmtInr(todayPnL) : '—'}
            sub={livePricesReady ? fmtPct(todayValuePct) : '—'}
            positive={todayPnL >= 0} />
          <KpiCard label="Expected Return"  value={expReturn ? `${expReturn}%` : '—'} sub={vol ? `Vol ${vol.toFixed(1)}%` : null} neutral />
          <KpiCard label="Sharpe Ratio"     value={sharpe?.toFixed(2) || '—'}         sub={sharpe >= 1 ? 'Excellent' : sharpe >= 0.5 ? 'Good' : 'Fair'} neutral />
        </div>

        {/* ── Signal strip ── */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'BUY signals',  count: buyCount,  color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)'  },
            { label: 'HOLD signals', count: holdCount, color: '#008080', bg: 'rgba(0,128,128,0.07)',  border: 'rgba(0,128,128,0.18)' },
            { label: 'SELL signals', count: sellCount, color: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.18)' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <span className="text-lg font-bold" style={{ fontFamily: 'Syne,sans-serif', color: s.color }}>{s.count}</span>
              <span className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.5)' }}>{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl ml-auto"
            style={{ background: 'rgba(0,128,128,0.05)', border: '1px solid rgba(0,128,128,0.12)' }}>
            <span className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>
              Invested: <strong style={{ color: '#0d2b2b' }}>{fmtInr(investedCapital)}</strong>
            </span>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="flex flex-col lg:flex-row gap-5">

          {/* LEFT — tabs */}
          <div className="flex-1 min-w-0">
            {/* tab bar */}
            <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: 'rgba(0,128,128,0.07)', border: '1px solid rgba(0,128,128,0.1)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all"
                  style={{
                    fontFamily: 'Space Grotesk,sans-serif',
                    background: activeTab === t.id ? '#008080' : 'transparent',
                    color: activeTab === t.id ? '#F4E1C1' : 'rgba(13,43,43,0.55)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── HOLDINGS ── */}
            {activeTab === 'holdings' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allocations.filter(a => a.amount > 0).map(a => {
                  const isCash = a.ticker === 'CASH'
                  const lp     = livePrices[a.ticker]
                  const price  = lp?.current_price || 0
                  const sh     = shares[a.ticker] || 0
                  const curVal = isCash ? a.amount : (sh * price || a.amount)
                  const pnl    = curVal - a.amount
                  const pnlPct = a.amount > 0 ? (pnl / a.amount) * 100 : 0

                  // today's daily change — same formula as header todayPnL
                  let dailyPnL = 0
                  let chgPct   = 0
                  if (!isCash && sh > 0 && lp) {
                    if (lp.current_price != null && lp.prev_close != null) {
                      dailyPnL = sh * (lp.current_price - lp.prev_close)
                      chgPct   = lp.change_pct_1d ?? 0
                    } else if (lp.current_price != null && lp.change_pct_1d != null) {
                      const prevClose = lp.current_price / (1 + lp.change_pct_1d / 100)
                      dailyPnL = sh * (lp.current_price - prevClose)
                      chgPct   = lp.change_pct_1d
                    }
                  }

                  return (
                    <div key={a.ticker} className="p-4 rounded-2xl space-y-3"
                      style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{a.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                            {a.ticker.replace('.NS','')} · {a.weight_pct?.toFixed(1)}%
                          </p>
                        </div>
                        <SignalBadge signal={a.signal} />
                      </div>

                      <div className="flex items-baseline justify-between">
                        <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#0d2b2b' }}>
                          {isCash ? 'Cash' : price ? fmtInr(price) : '—'}
                        </p>
                        {!isCash && (
                          <span style={{ fontFamily: 'Space Mono,monospace', fontSize: '12px', fontWeight: 600, color: chgPct >= 0 ? '#16a34a' : '#dc2626' }}>
                            {livePricesReady ? <>{chgPct >= 0 ? '▲' : '▼'} {Math.abs(chgPct).toFixed(2)}%</> : '—'}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between text-xs" style={{ fontFamily: 'Space Mono,monospace' }}>
                        <span style={{ color: 'rgba(13,43,43,0.45)' }}>{fmtInr(a.amount)} invested</span>
                        <span style={{ color: pnl >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {pnl >= 0 ? '+' : ''}{fmtInr(pnl)} ({fmtPct(pnlPct)})
                        </span>
                      </div>

                      {!isCash && livePricesReady && (
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'Space Mono,monospace' }}>
                          <span style={{ color: 'rgba(13,43,43,0.45)' }}>Today's change</span>
                          <span style={{ color: dailyPnL >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                            {dailyPnL >= 0 ? '+' : ''}{fmtInr(dailyPnL)}
                          </span>
                        </div>
                      )}

                      {a.close_prices?.length > 2 && (
                        <MiniSparkline data={a.close_prices} color={pnl >= 0 ? '#16a34a' : '#dc2626'} />
                      )}

                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,128,128,0.1)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(Math.max((curVal / a.amount) * 100, 0), 100)}%`, background: pnl >= 0 ? '#16a34a' : '#dc2626' }} />
                      </div>

                      {a.confidence > 0 && (
                        <p className="text-[11px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                          {(a.confidence * 100).toFixed(0)}% model confidence
                        </p>
                      )}
                      {a.reason && (
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(13,43,43,0.55)', fontFamily: 'Space Grotesk,sans-serif', fontStyle: 'italic' }}>
                          {a.reason}
                        </p>
                      )}
                      {a.high_52w > 0 && (
                        <div className="text-[11px] flex justify-between" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)' }}>
                          <span>52W L: {fmtInr(a.low_52w)}</span>
                          <span>52W H: {fmtInr(a.high_52w)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── ML SIGNALS ── */}
            {activeTab === 'signals' && (
              <div className="space-y-2.5">
                {allocations.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono,monospace' }}>No signal data available</p>
                )}
                {allocations.map(a => {
                  const ind = a.indicators || {}
                  return (
                    <div key={a.ticker} className="p-4 rounded-2xl" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{a.name}</p>
                          <p className="text-[11px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>{a.ticker.replace('.NS','')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <SignalBadge signal={a.signal} />
                          {a.confidence > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(0,128,128,0.07)', color: '#008080', fontFamily: 'Space Mono,monospace' }}>
                              {(a.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {Object.keys(ind).length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[
                            { label: 'RSI 14',    val: ind.rsi_14?.toFixed(1),     alert: ind.rsi_14 > 70 ? 'overbought' : ind.rsi_14 < 30 ? 'oversold' : null },
                            { label: 'MACD',      val: ind.macd_diff?.toFixed(3)                                                                                  },
                            { label: 'BB %',      val: ind.bb_pct != null ? `${(ind.bb_pct*100).toFixed(0)}%` : null                                              },
                            { label: 'vs 50MA',   val: ind.price_vs_50ma  != null ? fmtPct(ind.price_vs_50ma)  : null                                             },
                            { label: 'vs 200MA',  val: ind.price_vs_200ma != null ? fmtPct(ind.price_vs_200ma) : null                                             },
                            { label: 'Vol ratio', val: ind.volume_ratio?.toFixed(2)                                                                               },
                          ].filter(x => x.val != null).map(x => (
                            <div key={x.label} className="p-2 rounded-xl text-center" style={{ background: 'rgba(0,128,128,0.05)' }}>
                              <p className="text-[10px] uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.1em' }}>{x.label}</p>
                              <p className="text-xs font-bold mt-0.5" style={{
                                fontFamily: 'Space Mono,monospace',
                                color: x.alert === 'overbought' ? '#dc2626' : x.alert === 'oversold' ? '#16a34a' : '#0d2b2b',
                              }}>{x.val}</p>
                              {x.alert && <p className="text-[9px]" style={{ color: x.alert === 'overbought' ? '#dc2626' : '#16a34a' }}>{x.alert}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {a.reason && (
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(13,43,43,0.55)', fontFamily: 'Space Grotesk,sans-serif', fontStyle: 'italic' }}>
                          {a.reason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── AI INSIGHTS ── */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                {insights.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono,monospace' }}>Generating insights…</p>
                )}
                {insights.map((ins, i) => {
                  const st = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.tip
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                      style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                      <span className="text-base shrink-0 mt-0.5">{st.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{ins.stock || 'Portfolio'}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.label, fontFamily: 'Space Mono,monospace' }}>
                            {ins.type}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(13,43,43,0.65)', fontFamily: 'Space Grotesk,sans-serif' }}>{ins.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── SCENARIOS ── */}
            {activeTab === 'scenarios' && (
              <div className="space-y-3">
                <p className="text-xs mb-2" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                  {stress?.summary || 'Historical crash stress-testing against 2008, COVID-2020, and 2022 selloffs'}
                </p>
                {stressLoading && !stress && (
                  <p className="text-sm text-center py-8" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono,monospace' }}>Running historical crash stress test…</p>
                )}
                {stress?.scenarios?.map(sc => {
                  const outperformed = sc.portfolio_impact_pct > sc.benchmark_impact_pct
                  const bg = outperformed ? 'rgba(0,128,128,0.06)' : 'rgba(220,38,38,0.06)'
                  const border = outperformed ? 'rgba(0,128,128,0.18)' : 'rgba(220,38,38,0.18)'
                  const chartData = [
                    { name: 'Portfolio', impact: sc.portfolio_impact_pct },
                    { name: 'NIFTY 50', impact: sc.benchmark_impact_pct },
                  ]
                  return (
                    <div key={sc.name} className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-bold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{sc.name}</p>
                          <p className="text-[11px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>{sc.period}</p>
                        </div>
                        <div className="text-left sm:text-right flex sm:flex-col gap-3 sm:gap-0">
                          <p className="font-bold text-xs sm:text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#dc2626' }}>
                            Your portfolio: {sc.portfolio_impact_pct}%
                          </p>
                          <p className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.55)' }}>
                            NIFTY buy-and-hold: {sc.benchmark_impact_pct}%
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold mb-3" style={{ fontFamily: 'Space Grotesk,sans-serif', color: outperformed ? '#16a34a' : '#dc2626' }}>
                        {sc.verdict}
                      </p>
                      <div className="w-full h-[120px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(13,43,43,0.6)', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono' }} unit="%" axisLine={false} tickLine={false} />
                            <Tooltip formatter={val => [`${val}%`, 'Impact']} contentStyle={{ background: '#F4E1C1', border: '1px solid rgba(0,128,128,0.2)', borderRadius: '8px', fontSize: '11px', fontFamily: 'Space Mono' }} />
                            <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
                              <Cell fill="#dc2626" />
                              <Cell fill="#94a3b8" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center text-[11px]" style={{ borderColor: 'rgba(0,128,128,0.1)', fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>
                        <span>Data availability:</span>
                        <span className="font-semibold" style={{ color: '#0d2b2b' }}>
                          {sc.tickers_available} of {sc.tickers_total} stocks analyzed
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* allocation donut */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                  <p className="text-xs uppercase mb-4" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.13em' }}>Allocation Breakdown</p>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <PieChart width={160} height={160}>
                      <Pie data={allocations.filter(a => a.weight_pct > 0)} dataKey="weight_pct" nameKey="name" cx={80} cy={80} innerRadius={48} outerRadius={72} strokeWidth={0}>
                        {allocations.filter(a => a.weight_pct > 0).map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Weight']} />
                    </PieChart>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      {allocations.filter(a => a.weight_pct > 0).map((a, i) => (
                        <div key={a.ticker} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <span className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.55)' }}>
                            {a.ticker.replace('.NS','')} {a.weight_pct?.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DEVIL'S ADVOCATE ── */}
            {activeTab === 'devil' && (
              <div className="space-y-4">
                {/* header */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.22)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <span style={{ fontSize: '22px' }}>⚔️</span>
                    <p className="font-bold" style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.1rem', color: '#dc2626' }}>The Devil's Advocate</p>
                  </div>
                  <p className="text-sm" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.6)' }}>
                    Our AI attacks your own portfolio to find hidden risks — concentration, correlation, and regime exposure.
                  </p>
                  <p className="mt-1 text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>
                    All numbers computed from live 1-year price data. Nothing is hardcoded.
                  </p>
                </div>

                {/* loading */}
                {devilLoading && !devil && (
                  <p className="text-sm text-center py-8" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono,monospace' }}>
                    Computing real correlations from live data…
                  </p>
                )}

                {/* real metrics chips */}
                {devil?.metrics && (
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Top sector',    val: `${devil.metrics.top_sector} · ${devil.metrics.top_sector_weight}%` },
                      { label: 'Largest stock', val: `${devil.metrics.top_holding_name} · ${devil.metrics.top_holding_weight}%` },
                      { label: 'Avg correlation (how stocks move together)', val: devil.metrics.avg_corr?.toFixed(2) },
                      { label: 'Real positions (>5% weight)', val: devil.metrics.effective_count },
                    ].map(c => (
                      <div key={c.label} className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(13,43,43,0.05)', border: '1px solid rgba(13,43,43,0.1)' }}>
                        <p className="text-[10px] uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.08em' }}>{c.label}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ fontFamily: 'Space Mono,monospace', color: '#0d2b2b' }}>{c.val}</p>
                      </div>
                    ))}
                    {devil.metrics.highest_corr > 0 && (
                      <div className="px-3 py-1.5 rounded-xl" style={{ background: devil.metrics.high_corr_flag ? 'rgba(220,38,38,0.07)' : 'rgba(13,43,43,0.05)', border: `1px solid ${devil.metrics.high_corr_flag ? 'rgba(220,38,38,0.25)' : 'rgba(13,43,43,0.1)'}` }}>
                        <p className="text-[10px] uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.08em' }}>Highest correlated pair</p>
                        <p className="text-xs font-bold mt-0.5" style={{ fontFamily: 'Space Mono,monospace', color: devil.metrics.high_corr_flag ? '#dc2626' : '#0d2b2b' }}>
                          {devil.metrics.highest_corr_pair?.map(t => t.replace('.NS','')).join(' & ')} · {devil.metrics.highest_corr?.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* warning cards */}
                {devil?.warnings?.map((w, i) => {
                  const sevColor  = w.severity === 'high' ? '#dc2626' : w.severity === 'medium' ? '#f59e0b' : 'rgba(13,43,43,0.45)'
                  const sevBg     = w.severity === 'high' ? 'rgba(220,38,38,0.08)'  : w.severity === 'medium' ? 'rgba(245,158,11,0.08)'  : 'rgba(13,43,43,0.04)'
                  const sevBorder = w.severity === 'high' ? 'rgba(220,38,38,0.22)'  : w.severity === 'medium' ? 'rgba(245,158,11,0.22)'  : 'rgba(13,43,43,0.12)'
                  return (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${sevBorder}` }}>
                      {/* red left accent bar */}
                      <div style={{ height: 3, background: sevColor }} />
                      <div className="p-4" style={{ background: sevBg }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ background: sevBg, border: `1px solid ${sevBorder}`, color: sevColor, fontFamily: 'Space Mono,monospace' }}>
                            {w.severity}
                          </span>
                          <p className="font-bold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{w.title}</p>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.7)' }}>
                          {w.critique}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {devil && !devil.warnings?.length && (
                  <p className="text-sm text-center py-6" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Mono,monospace' }}>No major risks detected.</p>
                )}
              </div>
            )}

            {/* ── WHAT-IF SIMULATOR ── */}
            {activeTab === 'whatif' && (() => {
              const equityAllocs = allocations.filter(a => a.ticker !== 'CASH')
              const investedCapital = allocations.reduce((s, a) => s + (a.amount || 0), 0)

              return (
                <div className="space-y-4">
                  {/* header */}
                  <div className="p-5 rounded-2xl" style={{ background: 'rgba(0,128,128,0.06)', border: '1px solid rgba(0,128,128,0.2)' }}>
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontSize: '22px' }}>🔬</span>
                      <p className="font-bold" style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.1rem', color: '#008080' }}>What-If Simulator</p>
                    </div>
                    <p className="text-sm" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.6)' }}>
                      Change your portfolio and see exactly how return, risk, and Sharpe change — re-optimised on live data, never estimated.
                    </p>
                  </div>

                  {/* controls */}
                  <div className="p-5 rounded-2xl space-y-5" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>

                    {/* extra capital slider */}
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <p className="text-xs uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.12em' }}>
                          Add extra capital
                        </p>
                        <p className="font-bold text-sm" style={{ fontFamily: 'Space Mono,monospace', color: '#008080' }}>
                          {wiExtraCapital > 0 ? `+₹${wiExtraCapital.toLocaleString('en-IN')}` : '₹0'}
                        </p>
                      </div>
                      <input
                        type="range" min={0} max={100000} step={1000}
                        value={wiExtraCapital}
                        onChange={e => { setWiExtraCapital(Number(e.target.value)); setWhatIf(null) }}
                        style={{ width: '100%', accentColor: '#008080', cursor: 'pointer' }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>₹0</span>
                        <span className="text-[10px]" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.35)' }}>₹1,00,000</span>
                      </div>
                    </div>

                    {/* remove holding dropdown */}
                    <div>
                      <p className="text-xs uppercase mb-2" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.12em' }}>
                        Remove a holding (optional)
                      </p>
                      <select
                        value={wiRemoveTicker}
                        onChange={e => { setWiRemoveTicker(e.target.value); setWhatIf(null) }}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '12px',
                          border: '1px solid rgba(0,128,128,0.25)', background: 'rgba(244,225,193,0.9)',
                          fontFamily: 'Space Grotesk,sans-serif', fontSize: '13px', color: '#0d2b2b',
                          outline: 'none', cursor: 'pointer',
                        }}
                      >
                        <option value="">— Keep all holdings —</option>
                        {equityAllocs.map(a => (
                          <option key={a.ticker} value={a.ticker}>
                            {a.name} ({a.weight_pct?.toFixed(1)}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* current capital info */}
                    <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid rgba(0,128,128,0.1)', paddingTop: '12px' }}>
                      <span style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>Current capital</span>
                      <span style={{ fontFamily: 'Space Mono,monospace', color: '#0d2b2b', fontWeight: 600 }}>{fmtInr(investedCapital)}</span>
                    </div>
                    {wiExtraCapital > 0 && (
                      <div className="flex justify-between text-xs -mt-3">
                        <span style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>New total capital</span>
                        <span style={{ fontFamily: 'Space Mono,monospace', color: '#16a34a', fontWeight: 600 }}>{fmtInr(investedCapital + wiExtraCapital)}</span>
                      </div>
                    )}

                    {/* FIX 4 — guidance hint */}
                    <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', borderTop: '1px solid rgba(0,128,128,0.08)', paddingTop: '10px' }}>
                      Tip: adding capital grows your money (see Projected Value below); removing a holding re-optimises return &amp; risk.
                    </p>

                    {/* recompute button */}
                    <button
                      onClick={runWhatIf}
                      disabled={whatIfLoading}
                      className="w-full py-3 text-sm font-semibold rounded-2xl transition-all disabled:opacity-50"
                      style={{ background: '#008080', color: '#F4E1C1', fontFamily: 'Space Grotesk,sans-serif', boxShadow: '0 4px 16px rgba(0,128,128,0.25)' }}
                      onMouseEnter={e => { if (!whatIfLoading) e.currentTarget.style.background = '#006666' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}
                    >
                      {whatIfLoading ? 'Re-optimising on live data…' : '⟳ Recompute Portfolio'}
                    </button>
                  </div>

                  {/* loading */}
                  {whatIfLoading && (
                    <p className="text-xs text-center py-4" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                      Downloading live prices and re-running optimizer…
                    </p>
                  )}

                  {/* before / after results */}
                  {whatIf && !whatIf.error && (() => {
                    const { before, after, delta, recommendation } = whatIf

                    // ₹ formatter with sign
                    const fmtGain = (v) => v == null ? '—'
                      : `${v >= 0 ? '+' : ''}${fmtInr(v)}`

                    // Projected 1-year value row — the one that visibly moves with extra capital
                    const projBefore = before.projected_value_1y
                    const projAfter  = after.projected_value_1y
                    const projDelta  = delta.extra_projected_gain ?? 0
                    const projBetter = projDelta >= 0

                    const metrics = [
                      {
                        label:  'Projected 1-Year Value (₹)',
                        before: projBefore != null ? fmtInr(projBefore) : '—',
                        after:  projAfter  != null ? fmtInr(projAfter)  : '—',
                        delta:  projDelta,
                        better: projBetter,
                        deltaFmt: fmtGain(projDelta),
                        isRupee: true,
                      },
                      {
                        label: 'Expected Return',
                        before: `${before.expected_annual_return}%`,
                        after:  `${after.expected_annual_return}%`,
                        delta:  delta.return_pct_change,
                        better: delta.return_pct_change > 0,
                      },
                      {
                        label: 'Volatility (Risk)',
                        before: `${before.portfolio_volatility}%`,
                        after:  `${after.portfolio_volatility}%`,
                        delta:  delta.volatility_pct_change,
                        better: delta.volatility_pct_change < 0,
                      },
                      {
                        label: 'Sharpe Ratio',
                        before: before.sharpe_ratio?.toFixed(2),
                        after:  after.sharpe_ratio?.toFixed(2),
                        delta:  delta.sharpe_change,
                        better: delta.sharpe_change > 0,
                      },
                    ]
                    return (
                      <div className="space-y-3">
                        {/* metric comparison cards */}
                        <p className="text-xs uppercase px-1" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.12em' }}>
                          Before → After
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {metrics.map(m => {
                            const dColor = m.delta === 0 ? '#008080' : m.better ? '#16a34a' : '#dc2626'
                            const dBg    = m.delta === 0 ? 'rgba(0,128,128,0.08)' : m.better ? 'rgba(22,163,74,0.09)' : 'rgba(220,38,38,0.08)'
                            const arrow  = m.delta === 0 ? '→' : m.better ? '▲' : '▼'
                            // rupee rows use pre-formatted string; % rows use numeric rounding
                            const deltaLabel = m.isRupee
                              ? m.deltaFmt
                              : m.delta !== 0
                                ? `${m.delta > 0 ? '+' : ''}${Math.abs(m.delta) < 1 ? m.delta.toFixed(3) : m.delta.toFixed(2)}`
                                : null
                            return (
                              <div key={m.label} className="p-4 rounded-2xl" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                                <p className="text-xs uppercase mb-2" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.12em' }}>
                                  {m.label}
                                </p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 text-center p-2 rounded-xl" style={{ background: 'rgba(13,43,43,0.05)' }}>
                                    <p className="text-[10px] mb-0.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)' }}>BEFORE</p>
                                    <p className="font-bold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: '#0d2b2b' }}>{m.before}</p>
                                  </div>
                                  <span style={{ fontSize: '18px', color: dColor }}>{arrow}</span>
                                  <div className="flex-1 text-center p-2 rounded-xl" style={{ background: dBg }}>
                                    <p className="text-[10px] mb-0.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)' }}>AFTER</p>
                                    <p className="font-bold text-sm" style={{ fontFamily: 'Syne,sans-serif', color: dColor }}>{m.after}</p>
                                  </div>
                                </div>
                                {deltaLabel && (
                                  <p className="text-[11px] text-center mt-2 font-semibold" style={{ fontFamily: 'Space Mono,monospace', color: dColor }}>
                                    {deltaLabel}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* recommendation */}
                        <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,128,128,0.05)', border: '1px solid rgba(0,128,128,0.15)' }}>
                          <p className="text-xs uppercase mb-1.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.1em' }}>AI Verdict</p>
                          <p className="text-sm leading-relaxed" style={{ fontFamily: 'Space Grotesk,sans-serif', color: 'rgba(13,43,43,0.7)' }}>
                            {recommendation}
                          </p>
                        </div>

                        {/* new allocations */}
                        {after.allocations?.length > 0 && (
                          <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                            <p className="text-xs uppercase mb-2" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.12em' }}>New Allocation</p>
                            {after.allocations.filter(a => a.weight_pct > 0).map((a, i) => (
                              <div key={a.ticker} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                  <span className="text-xs" style={{ fontFamily: 'Space Grotesk,sans-serif', color: '#0d2b2b' }}>{a.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.5)' }}>{fmtInr(a.amount)}</span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: 'Space Mono,monospace', background: 'rgba(0,128,128,0.08)', color: '#008080' }}>
                                    {a.weight_pct?.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {whatIf?.error && (
                    <p className="text-xs p-3 rounded-xl" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'Space Mono,monospace' }}>
                      {whatIf.error}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* RIGHT sidebar */}
          <div className="w-full lg:w-[300px] shrink-0 space-y-4">

            {/* Portfolio health */}
            <div className="p-5 rounded-2xl space-y-4" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
              <p className="text-xs uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.13em' }}>Portfolio Health</p>
              <RiskMeter volatility={vol} />
              <div style={{ height: '1px', background: 'rgba(0,128,128,0.1)' }} />
              {[
                { label: 'Expected Return', val: expReturn ? `${expReturn}%` : '—' },
                { label: 'Volatility',      val: vol ? `${vol.toFixed(1)}%` : '—'  },
                { label: 'Sharpe Ratio',    val: sharpe?.toFixed(2) || '—'         },
                { label: 'Holdings',        val: allocations.filter(a => a.amount > 0).length },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-xs" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>{r.label}</span>
                  <span className="text-xs font-bold" style={{ fontFamily: 'Space Mono,monospace', color: '#0d2b2b' }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Goal tracker */}
            {profile?.capital && (
              <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                <p className="text-xs uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.13em' }}>Goal Tracker</p>
                {profile.goal && (
                  <p className="text-xs italic" style={{ color: 'rgba(13,43,43,0.55)', fontFamily: 'Space Grotesk,sans-serif' }}>"{profile.goal}"</p>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.45)' }}>
                    <span>{fmtInr(currentValue)}</span>
                    <span>Target: {fmtInr(investedCapital * 1.16)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,128,128,0.1)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min((currentValue / (investedCapital * 1.16)) * 100, 100)}%`, background: '#008080' }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)' }}>
                    {currentValue >= investedCapital * 1.16 ? '✓ Target reached!' : currentValue >= investedCapital ? '↑ On track' : '⚠ Behind schedule'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick insights preview */}
            {insights.length > 0 && activeTab !== 'insights' && (
              <div className="p-5 rounded-2xl space-y-2.5" style={{ background: 'rgba(244,225,193,0.7)', border: '1px solid rgba(0,128,128,0.12)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase" style={{ fontFamily: 'Space Mono,monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.13em' }}>Top Insights</p>
                  <button onClick={() => setActiveTab('insights')} className="text-xs" style={{ color: '#008080', fontFamily: 'Space Mono,monospace' }}>See all →</button>
                </div>
                {insights.slice(0, 3).map((ins, i) => {
                  const st = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.tip
                  return (
                    <div key={i} className="flex gap-2 p-2.5 rounded-xl" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                      <span className="text-sm shrink-0">{st.icon}</span>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(13,43,43,0.6)', fontFamily: 'Space Grotesk,sans-serif' }}>{ins.text}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
