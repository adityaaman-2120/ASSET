import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { useInvestorStore } from '../store/investorStore'
import { api } from '../api/client'

function fmtInr(n) {
  if (n == null || isNaN(n)) return '₹0'
  return '₹' + Number(n.toFixed(0)).toLocaleString('en-IN')
}

function fmtDelta(n) {
  if (n == null || isNaN(n)) return '0.00'
  const s = n >= 0 ? '+' : ''
  return `${s}${n.toFixed(2)}`
}

function timeAgo(date) {
  if (!date) return ''
  const s = Math.floor((Date.now() - date) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

const SIGNAL_BG = {
  BUY: 'bg-green-100 text-green-800',
  HOLD: 'bg-yellow-100 text-yellow-800',
  SELL: 'bg-red-100 text-red-800',
}

const INSIGHT_ICONS = {
  warning: { icon: '⚠', bg: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600' },
  positive: { icon: '✅', bg: 'bg-green-50 border-green-200', iconColor: 'text-green-600' },
  negative: { icon: '📉', bg: 'bg-red-50 border-red-200', iconColor: 'text-red-600' },
  tip: { icon: '💡', bg: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const portfolio = useInvestorStore((s) => s.portfolio)
  const profile = useInvestorStore((s) => s.profile)

  const [livePrices, setLivePrices] = useState({})
  const [insights, setInsights] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shares, setShares] = useState({})

  const allocations = portfolio?.allocations || []
  const tickers = allocations.map((a) => a.ticker)

  const fetchLivePrices = useCallback(async () => {
    if (!tickers.length) return
    try {
      const res = await api.get('/api/live-prices', { params: { tickers: tickers.join(',') } })
      const map = {}
      res.data.forEach((item) => {
        map[item.ticker] = item
      })
      setLivePrices(map)
      setLastUpdated(Date.now())

      setShares((prev) => {
        const next = { ...prev }
        allocations.forEach((a) => {
          if (!prev[a.ticker] && map[a.ticker]?.current_price) {
            next[a.ticker] = a.amount / map[a.ticker].current_price
          }
        })
        return next
      })
    } catch (e) {
      console.error('Live prices fetch failed', e)
    }
  }, [tickers.join(',')])

  const fetchInsights = useCallback(async () => {
    if (!tickers.length) return
    try {
      const currentValue = computeCurrentValue()
      const invested = allocations.reduce((s, a) => s + a.amount, 0)
      const portItems = allocations.map((a) => ({
        ticker: a.ticker,
        name: a.name,
        weight_pct: a.weight_pct,
      }))
      const res = await api.post('/api/generate-insights', {
        portfolio: portItems,
        portfolio_value: currentValue,
        invested_capital: invested,
      })
      setInsights(res.data.insights || [])
    } catch (e) {
      console.error('Insights fetch failed', e)
    }
  }, [allocations, livePrices, shares])

  const computeCurrentValue = useCallback(() => {
    let total = 0
    allocations.forEach((a) => {
      const sh = shares[a.ticker] || 0
      const price = livePrices[a.ticker]?.current_price || 0
      total += sh * price
    })
    return total || allocations.reduce((s, a) => s + a.amount, 0)
  }, [allocations, livePrices, shares])

  const currentValue = computeCurrentValue()
  const investedCapital = allocations.reduce((s, a) => s + a.amount, 0)
  const totalReturn = investedCapital > 0 ? ((currentValue - investedCapital) / investedCapital) * 100 : 0

  const computeTodayPnL = () => {
    let total = 0
    allocations.forEach((a) => {
      const sh = shares[a.ticker] || 0
      const lp = livePrices[a.ticker]
      if (lp?.current_price && lp?.change_pct_1d != null) {
        total += sh * lp.current_price * (lp.change_pct_1d / 100)
      }
    })
    return total
  }
  const todayPnL = computeTodayPnL()

  useEffect(() => {
    if (!portfolio) {
      navigate('/')
      return
    }
    fetchLivePrices().then(() => fetchInsights())
    const interval = setInterval(fetchLivePrices, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLivePrices()
    await fetchInsights()
    setIsRefreshing(false)
  }

  const getShares = (ticker) => shares[ticker] || 0
  const getPrice = (ticker) => livePrices[ticker]?.current_price || 0
  const getChange = (ticker) => livePrices[ticker]?.change_pct_1d || 0

  if (!portfolio) return null

  const topHolding = [...allocations].sort((a, b) => b.weight_pct - a.weight_pct)[0]
  const sparkData = portfolio.close_prices?.slice(-30).map((p, i) => ({ i, p })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2a78d6]" />
          <span className="font-bold text-gray-900">QuantInvest</span>
        </div>
        <p className="text-xs text-gray-400">{timeAgo(lastUpdated)}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {profile?.investorType || 'Investor'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2a78d6] text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="Portfolio Value"
            value={fmtInr(currentValue)}
            badge={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`}
            badgeColor={totalReturn >= 0 ? 'green' : 'red'}
          />
          <KpiCard
            label="Today's P&L"
            value={fmtInr(todayPnL)}
            badge={`${todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(1)}%`}
            badgeColor={todayPnL >= 0 ? 'green' : 'red'}
          />
          <KpiCard
            label="Total Return"
            value={fmtDelta(totalReturn) + '%'}
            badge={fmtInr(currentValue - investedCapital)}
            badgeColor={totalReturn >= 0 ? 'green' : 'red'}
          />
          <KpiCard
            label="Sharpe Ratio"
            value={portfolio?.sharpe_ratio?.toFixed(2) || '—'}
            badge={portfolio?.sharpe_ratio >= 1 ? 'Good' : portfolio?.sharpe_ratio >= 0.5 ? 'Fair' : 'Low'}
            badgeColor={portfolio?.sharpe_ratio >= 1 ? 'green' : portfolio?.sharpe_ratio >= 0.5 ? 'yellow' : 'red'}
          />
        </div>

        {/* Main Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left — Stock Cards */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allocations.map((a) => {
                const price = getPrice(a.ticker)
                const chg = getChange(a.ticker)
                const sh = getShares(a.ticker)
                const currentStockValue = sh * price
                const investedStockValue = a.amount
                const progressPct = investedStockValue > 0 ? Math.min((currentStockValue / investedStockValue) * 100, 200) : 0
                const sig = { signal: 'HOLD', confidence: 0, reason: '' }

                return (
                  <div key={a.ticker} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.ticker}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {a.weight_pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <p className="text-xl font-bold text-gray-900">
                        {price ? fmtInr(price) : '—'}
                      </p>
                      {chg != null && (
                        <span className={`flex items-center gap-0.5 text-sm font-semibold ${chg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      {fmtInr(a.amount)} invested · {sh.toFixed(3)} shares
                    </p>

                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          currentStockValue >= investedStockValue ? 'bg-green-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SIGNAL_BG[sig.signal] || 'bg-gray-100'}`}>
                        {sig.signal}
                      </span>
                      <span className="text-xs text-gray-500">{(sig.confidence * 100).toFixed(0)}% confidence</span>
                    </div>

                    {sig.reason && (
                      <p className="text-xs text-gray-400 leading-relaxed">{sig.reason}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button className="text-xs font-medium text-[#2a78d6] hover:underline">Explain This →</button>
                      <button className="text-xs font-medium text-red-500 hover:underline">Sell</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — Sidebar */}
          <div className="w-full lg:w-[35%] space-y-4">
            {/* Risk Meter */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">Portfolio Risk</p>
              <div className="relative h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full overflow-hidden">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full shadow"
                  style={{
                    left: `${Math.min(Math.max((portfolio?.portfolio_volatility || 15) * 3, 2), 98)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {portfolio?.portfolio_volatility < 10 ? 'Low Risk' : portfolio?.portfolio_volatility < 20 ? 'Medium Risk' : 'High Risk'}
              </p>
            </div>

            {/* Goal Tracker */}
            {(profile?.goal || profile?.capital) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {profile?.goal || `Target: ${fmtInr(investedCapital * 1.16)} by 12 months`}
                </p>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-3 mb-2 overflow-hidden">
                  <div
                    className="h-full bg-[#2a78d6] rounded-full transition-all"
                    style={{ width: `${Math.min((currentValue / (investedCapital * 1.16)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {fmtInr(currentValue)} of {fmtInr(investedCapital * 1.16)} · {currentValue >= investedCapital * 1.16 ? '🎉 Target reached!' : currentValue >= investedCapital ? '✅ On track' : '⚠ Behind schedule'}
                </p>
              </div>
            )}

            {/* Sparkline */}
            {sparkData.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  {topHolding?.name || 'Portfolio'} Trend
                </p>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="p"
                      stroke="#2a78d6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* AI Insight Feed */}
        {insights.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Live Insights</h2>
            <div className="space-y-3">
              {insights.slice(0, 5).map((ins, i) => {
                const style = INSIGHT_ICONS[ins.type] || INSIGHT_ICONS.tip
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg}`}>
                    <span className={`text-base shrink-0 ${style.iconColor}`}>{style.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ins.stock || 'Portfolio'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{ins.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">just now</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, badge, badgeColor }) {
  const badgeClasses = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
      {badge != null && (
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses[badgeColor] || 'bg-gray-100 text-gray-700'}`}>
          {badge}
        </span>
      )}
    </div>
  )
}
