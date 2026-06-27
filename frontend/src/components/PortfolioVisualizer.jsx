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

const COLORS = ['#00D4FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1']

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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/40 border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Expected Return</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-emerald-400 font-mono">{baseReturn.toFixed(1)}%</span>
            <span className="text-xs text-slate-400">p.a.</span>
          </div>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Portfolio Volatility</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#7C3AED] font-mono">{(volatility * 100).toFixed(1)}%</span>
            <span className="text-xs text-slate-400">risk</span>
          </div>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Sharpe Ratio Ratio</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#00D4FF] font-mono">{portfolio.sharpe?.toFixed(2) || '0.00'}</span>
            <span className="text-xs text-slate-400">efficiency</span>
          </div>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Worst-case Drawdown</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-red-500 font-mono">
              {stressTest.summary?.worst_drawdown ? `${Math.abs(stressTest.summary.worst_drawdown * 100).toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-slate-400">simulated</span>
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Pie Chart */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-[#00D4FF]" />
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
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#F9FAFB' }}
                    formatter={(value) => [`${value}%`, 'Weight']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No allocation data available.
              </div>
            )}
          </div>
        </Card>

        {/* Timeline projection */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#7C3AED]" />
            Projected Value Growth
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="year" stroke="#6b7280" fontSize={11} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Projected Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Rationale and Stock Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Stock Picks */}
        <Card className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-[#00D4FF]" />
            Top 5 Allocations & SHAP Explanations
          </h3>

          <div className="space-y-4 divide-y divide-slate-800">
            {topPicks.map((pick, idx) => {
              const shap = pick.shap_explanation || {}
              const topFactors = shap.top_factors || []

              return (
                <div key={pick.ticker} className={`pt-4 ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-white text-base">{pick.ticker}</span>
                      <span className="text-xs text-slate-500 block capitalize">{pick.sector || 'other'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#00D4FF] font-mono text-base">{(pick.weight * 100).toFixed(1)}%</span>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Weight</span>
                    </div>
                  </div>

                  {/* SHAP explanations */}
                  <div className="mt-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-2">Model Rationale Factors</span>
                    {topFactors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {topFactors.map((factor, fIdx) => (
                          <div
                            key={fIdx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                              factor.direction === 'positive'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
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
                      <span className="text-slate-500 text-xs italic">Historical price momentum supports allocation.</span>
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
            <div className="absolute top-0 right-0 p-3 text-[#7C3AED]/20">
              <Flame className="h-16 w-16" />
            </div>
            
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI Portfolio Risk Score</h3>
            <div className="inline-flex items-baseline gap-1 mt-2">
              <span className="text-6xl font-black text-red-500 font-mono">
                {devilsCritique.risk_score || 5}
              </span>
              <span className="text-sm text-slate-500">/ 10</span>
            </div>

            <div className="text-xs text-slate-300 text-left bg-slate-950/40 p-4 rounded-lg border border-slate-900 leading-relaxed">
              <span className="font-bold text-white block mb-1 text-[11px] uppercase tracking-wider text-slate-400">Risk Manager Review</span>
              {devilsCritique.rationale || 'LLM critique report currently pending database refresh.'}
            </div>
          </Card>

          {/* Warnings List */}
          {riskWarnings.length > 0 && (
            <Card className="border-red-950 bg-red-950/10 space-y-4">
              <h3 className="text-red-400 font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Critical Risk Warnings
              </h3>
              <ul className="space-y-2 text-xs text-red-300 list-disc pl-4 leading-relaxed">
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
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Expected Return Ranges
          </h3>
          <p className="text-xs text-slate-400">
            Statistical projection modeling return ranges based on 1.5 standard deviation (volatility) limits.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-sm">
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Pessimistic</span>
              <span className="font-bold text-red-400 font-mono text-lg">{pessimisticReturn.toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Base Estimate</span>
              <span className="font-bold text-emerald-400 font-mono text-lg">{baseReturn.toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Optimistic</span>
              <span className="font-bold text-[#00D4FF] font-mono text-lg">{optimisticReturn.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        {/* Benchmarks Comparison Table */}
        <Card className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#00D4FF]" />
            Market Benchmark Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-2.5">Universe</th>
                  <th className="py-2.5">Expected Return</th>
                  <th className="py-2.5">Volatility</th>
                  <th className="py-2.5">Sharpe Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {benchmarkData.map((row, idx) => (
                  <tr key={idx} className={idx === 0 ? 'text-white font-bold' : ''}>
                    <td className="py-3 font-sans">{row.name}</td>
                    <td className="py-3 text-emerald-400">{row.return.toFixed(1)}%</td>
                    <td className="py-3 text-[#7C3AED]">{row.volatility.toFixed(1)}%</td>
                    <td className="py-3 text-[#00D4FF]">{row.sharpe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Stress Testing Scenarios */}
      <Card className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Historical Stress Scenario Simulations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {Object.entries(stressTest).map(([key, value]) => {
            if (key === 'summary' || !value || typeof value !== 'object') return null
            const labelMap = {
              '2008_crash': '2008 Financial Crisis',
              'covid_2020': '2020 COVID-19 Crash',
              'correction_2022': '2022 Interest Rate Correction',
            }

            return (
              <div key={key} className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-3">
                <span className="text-xs font-bold text-slate-400 block border-b border-slate-800 pb-2">
                  {labelMap[key] || key}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Max Drawdown</span>
                    <span className="font-bold text-red-400 font-mono">
                      {value.max_drawdown ? `${(value.max_drawdown * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scenario Return</span>
                    <span className={`font-bold font-mono ${value.final_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {value.final_return ? `${(value.final_return * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 block">Recovery Time</span>
                    <span className="font-bold text-slate-300 font-mono">
                      {value.recovery_days ? `${value.recovery_days} Days` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 block">Status</span>
                    <Badge variant={value.recovered_within_window ? 'success' : 'danger'}>
                      {value.recovered_within_window ? 'Recovered' : 'Unrecovered'}
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
