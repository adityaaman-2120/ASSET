import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  Award,
  Calendar,
  Layers,
  PieChart as PieIcon,
  HelpCircle,
} from 'lucide-react'
import Card from './Card'
import Badge from './Badge'

const COLORS = ['#008080', '#9a6e3a', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F97316', '#06B6D4']

export default function PortfolioVisualizer({ data }) {
  if (!data) return null

  const portfolio = data.portfolio || {}
  const holdings = data.holdings || []
  const stressTest = data.stress_test || {}
  const devilsCritique = data.devils_critique || {}
  const chartsData = data.charts_data || {}
  const riskWarnings = data.risk_warnings || devilsCritique.warnings || []

  // 1. Sector Allocation data formatting
  const sectorAlloc = chartsData.sector_allocation || {}
  const sectorData = Object.entries(sectorAlloc).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value: Number((value * 100).toFixed(1)),
  }))

  // 2. Expected Return Range Calculation (Client-side)
  const expectedReturn = portfolio.expected_return || 0.15
  const volatility = portfolio.volatility || 0.18
  const baseReturn = expectedReturn * 100
  const pessimisticReturn = Math.max(-50, (expectedReturn - 1.5 * volatility) * 100)
  const optimisticReturn = (expectedReturn + 1.5 * volatility) * 100

  // 3. Benchmarks Comparison
  const benchmarkData = [
    {
      name: 'Your Portfolio',
      return: Number(baseReturn.toFixed(1)),
      volatility: Number((volatility * 100).toFixed(1)),
      sharpe: Number(portfolio.sharpe?.toFixed(2) || 0),
    },
    {
      name: 'Nifty 50',
      return: 12.0,
      volatility: 15.0,
      sharpe: 0.8,
    },
    {
      name: 'Sensex',
      return: 11.5,
      volatility: 14.8,
      sharpe: 0.78,
    },
  ]

  // 4. Investment Timeline Projection
  const amount = portfolio.amount || 100000
  const timelineData = [
    { year: 'Start', value: amount },
    { year: '1 Year', value: Math.round(amount * Math.pow(1 + expectedReturn, 1)) },
    { year: '3 Years', value: Math.round(amount * Math.pow(1 + expectedReturn, 3)) },
    { year: '5 Years', value: Math.round(amount * Math.pow(1 + expectedReturn, 5)) },
  ]

  // Sort holdings by weight to find top picks
  const sortedHoldings = [...holdings].sort((a, b) => (b.weight || 0) - (a.weight || 0))
  const topPicks = sortedHoldings.slice(0, 5)

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between p-5 bg-[rgba(244,225,193,0.8)] border-[rgba(0,128,128,0.25)]">
          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.55)] block">Expected Return</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-700 font-mono">{baseReturn.toFixed(1)}%</span>
            <span className="text-xs font-bold text-[#0d2b2b]/70">p.a.</span>
          </div>
        </Card>
        <Card className="flex flex-col justify-between p-5 bg-[rgba(244,225,193,0.8)] border-[rgba(0,128,128,0.25)]">
          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.55)] block">Portfolio Volatility</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-[#9a6e3a] font-mono">{(volatility * 100).toFixed(1)}%</span>
            <span className="text-xs font-bold text-[#0d2b2b]/70">risk</span>
          </div>
        </Card>
        <Card className="flex flex-col justify-between p-5 bg-[rgba(244,225,193,0.8)] border-[rgba(0,128,128,0.25)]">
          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.55)] block">Sharpe Ratio</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-[#008080] font-mono">{portfolio.sharpe?.toFixed(2) || '0.00'}</span>
            <span className="text-xs font-bold text-[#0d2b2b]/70">efficiency</span>
          </div>
        </Card>
        <Card className="flex flex-col justify-between p-5 bg-[rgba(244,225,193,0.8)] border-[rgba(0,128,128,0.25)]">
          <span className="text-[10px] uppercase font-black tracking-wider text-[rgba(13,43,43,0.55)] block">Worst-case Drawdown</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-red-600 font-mono">
              {stressTest.summary?.worst_drawdown ? `${Math.abs(stressTest.summary.worst_drawdown * 100).toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs font-bold text-[#0d2b2b]/70">simulated</span>
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Pie Chart */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-[#008080]" />
            Sector Allocation
          </h3>
          <div className="h-72">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d2b2b', borderColor: '#008080', borderRadius: '8px', color: '#F4E1C1' }}
                    itemStyle={{ color: '#F4E1C1', fontWeight: 'bold' }}
                    formatter={(value) => [`${value}%`, 'Weight']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#0d2b2b]/60 text-xs italic font-medium">
                No allocation data available.
              </div>
            )}
          </div>
        </Card>

        {/* Timeline projection */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#9a6e3a]" />
            Projected Value Growth
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008080" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,128,0.15)" />
                <XAxis dataKey="year" stroke="#0d2b2b" fontSize={11} fontWeight={600} />
                <YAxis
                  stroke="#0d2b2b"
                  fontSize={11}
                  fontWeight={600}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d2b2b', borderColor: '#008080', borderRadius: '8px', color: '#F4E1C1' }}
                  itemStyle={{ color: '#F4E1C1', fontWeight: 'bold' }}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Projected Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#008080" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Rationale and Stock Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Stock Picks */}
        <Card className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
            <Award className="h-5 w-5 text-[#008080]" />
            Top 5 Allocations & SHAP Explanations
          </h3>

          <div className="space-y-4 divide-y divide-[rgba(0,128,128,0.2)]">
            {topPicks.map((pick, idx) => {
              const shap = pick.shap_explanation || {}
              const topFactors = shap.top_factors || []

              return (
                <div key={pick.ticker} className={`pt-4 ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-[#0d2b2b] text-base">{pick.ticker}</span>
                      <span className="text-xs font-semibold text-[#0d2b2b]/70 block capitalize">{pick.sector || 'other'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#008080] font-mono text-base">{(pick.weight * 100).toFixed(1)}%</span>
                      <span className="text-[10px] text-[#0d2b2b]/60 block uppercase font-bold tracking-wider">Weight</span>
                    </div>
                  </div>

                  {/* SHAP explanations */}
                  <div className="mt-3 bg-[rgba(255,255,255,0.6)] p-3 rounded-lg border border-[rgba(0,128,128,0.2)] shadow-sm">
                    <span className="text-[10px] text-[#0d2b2b]/70 uppercase font-black tracking-wider block mb-2">Model Rationale Factors</span>
                    {topFactors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {topFactors.map((factor, fIdx) => (
                          <div
                            key={fIdx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                              factor.direction === 'positive'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}
                          >
                            <span>{factor.factor}</span>
                            <span className="font-mono text-[9px]">
                              ({factor.direction === 'positive' ? '+' : ''}
                              {factor.impact.toFixed(3)})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#0d2b2b]/70 text-xs italic font-medium">Historical price momentum supports allocation.</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Devil's Advocate & Risk Critique */}
        <div className="space-y-6">
          {/* Risk Score */}
          <Card className="text-center relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 p-3 text-[#9a6e3a]/15">
              <Flame className="h-16 w-16" />
            </div>
            
            <h3 className="text-sm font-black text-[#0d2b2b]/80 uppercase tracking-wider">AI Portfolio Risk Score</h3>
            <div className="inline-flex items-baseline gap-1 mt-2">
              <span className="text-6xl font-black text-red-600 font-mono">
                {devilsCritique.risk_score || 5}
              </span>
              <span className="text-sm font-bold text-[#0d2b2b]/60">/ 10</span>
            </div>

            <div className="text-xs text-[#0d2b2b] font-medium text-left bg-[rgba(255,255,255,0.6)] p-4 rounded-lg border border-[rgba(0,128,128,0.2)] leading-relaxed shadow-sm">
              <span className="font-black text-[#008080] block mb-1 text-[11px] uppercase tracking-wider">Risk Manager Review</span>
              {devilsCritique.rationale || 'LLM critique report currently pending database refresh.'}
            </div>
          </Card>

          {/* Warnings List */}
          {riskWarnings.length > 0 && (
            <Card className="border-red-300 bg-red-50 space-y-4 shadow-sm">
              <h3 className="text-red-800 font-black text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Critical Risk Warnings
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-red-900 list-disc pl-4 leading-relaxed">
                {riskWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Return Range & Benchmark Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Range */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#008080]" />
            Expected Return Ranges
          </h3>
          <p className="text-xs font-medium text-[#0d2b2b]/70">
            Statistical projection modeling return ranges based on 1.5 standard deviation (volatility) limits.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-sm">
            <div className="p-3 bg-red-100/60 border border-red-300 rounded-lg shadow-sm">
              <span className="text-[10px] text-red-800 block uppercase font-black tracking-wider">Pessimistic</span>
              <span className="font-black text-red-700 font-mono text-lg">{pessimisticReturn.toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-lg shadow-sm">
              <span className="text-[10px] text-emerald-800 block uppercase font-black tracking-wider">Base Estimate</span>
              <span className="font-black text-emerald-800 font-mono text-lg">{baseReturn.toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-teal-100/60 border border-teal-300 rounded-lg shadow-sm">
              <span className="text-[10px] text-[#008080] block uppercase font-black tracking-wider">Optimistic</span>
              <span className="font-black text-[#008080] font-mono text-lg">{optimisticReturn.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        {/* Benchmarks Comparison Table */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#008080]" />
            Market Benchmark Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0d2b2b]">
              <thead>
                <tr className="border-b border-[rgba(0,128,128,0.25)] text-[#0d2b2b]/70 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-2.5">Universe</th>
                  <th className="py-2.5">Expected Return</th>
                  <th className="py-2.5">Volatility</th>
                  <th className="py-2.5">Sharpe Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,128,128,0.15)] font-mono">
                {benchmarkData.map((row, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-[rgba(0,128,128,0.08)] font-bold text-[#0d2b2b]' : ''}>
                    <td className="py-3 px-2 font-sans font-semibold">{row.name}</td>
                    <td className="py-3 text-emerald-700 font-bold">{row.return.toFixed(1)}%</td>
                    <td className="py-3 text-[#9a6e3a] font-bold">{row.volatility.toFixed(1)}%</td>
                    <td className="py-3 text-[#008080] font-bold">{row.sharpe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Stress Testing Scenarios */}
      <Card className="space-y-4">
        <h3 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Historical Stress Scenario Simulations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {(stressTest.scenarios || []).map((sc) => {
            const labelMap = {
              '2008_crash': '2008 Financial Crisis',
              'covid_2020': '2020 COVID-19 Crash',
              '2022_correction': '2022 Interest Rate Correction',
              'correction_2022': '2022 Interest Rate Correction',
            }
            const key = sc.name
            return (
              <div key={key} className="bg-[rgba(255,255,255,0.6)] p-4 rounded-xl border border-[rgba(0,128,128,0.2)] space-y-3 shadow-sm">
                <span className="text-sm font-black text-[#0d2b2b] block border-b border-[rgba(0,128,128,0.15)] pb-2">
                  {labelMap[key] || key}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#0d2b2b]/60 font-semibold block">Max Drawdown</span>
                    <span className="font-black text-red-600 font-mono">
                      {sc.max_drawdown ? `${(sc.max_drawdown * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#0d2b2b]/60 font-semibold block">Scenario Return</span>
                    <span className={`font-black font-mono ${(sc.portfolio_return ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {sc.portfolio_return != null ? `${(sc.portfolio_return * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[#0d2b2b]/60 font-semibold block">Recovery Time</span>
                    <span className="font-bold text-[#0d2b2b] font-mono">
                      {sc.recovery_months != null ? `${sc.recovery_months} mo` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[#0d2b2b]/60 font-semibold block">Status</span>
                    <Badge variant={sc.recovered_within_window ? 'success' : 'danger'}>
                      {sc.recovered_within_window ? 'Recovered' : 'Unrecovered'}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
