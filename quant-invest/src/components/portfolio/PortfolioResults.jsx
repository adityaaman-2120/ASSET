import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const SIGNAL_COLORS = { BUY: 'green', HOLD: '#ca8a04', SELL: 'red' }
const SIGNAL_BG = { BUY: 'bg-green-100 text-green-800', HOLD: 'bg-yellow-100 text-yellow-800', SELL: 'bg-red-100 text-red-800' }

const CHART_COLORS = [
  '#2a78d6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

function fmtInr(n) {
  if (n == null || isNaN(n)) return '₹0'
  return '₹' + Number(n.toFixed(0)).toLocaleString('en-IN')
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0%'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function Modal({ reason, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-lg border" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700 leading-relaxed">{reason}</p>
        <button onClick={onClose} className="mt-4 text-sm font-medium text-[#2a78d6] hover:underline">
          Close
        </button>
      </div>
    </div>
  )
}

export default function PortfolioResults({ data, signals }) {
  const [modalReason, setModalReason] = useState(null)
  const { allocations = [], expected_annual_return, portfolio_volatility, sharpe_ratio, scenario = {} } = data || {}

  const pieData = allocations
    .filter((a) => a.weight_pct > 0)
    .map((a) => ({ name: a.ticker, value: a.weight_pct }))

  const sharpeLabel =
    sharpe_ratio >= 1.5 ? 'Excellent' : sharpe_ratio >= 1 ? 'Good' : sharpe_ratio >= 0.5 ? 'Fair' : 'Poor'

  return (
    <div className="space-y-6">
      {modalReason && <Modal reason={modalReason} onClose={() => setModalReason(null)} />}

      {/* Section 1 — Allocation Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Your Portfolio Allocation</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 sm:px-6 py-3">Stock</th>
                <th className="px-4 sm:px-6 py-3">Signal</th>
                <th className="px-4 sm:px-6 py-3 text-right">Allocation</th>
                <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                <th className="px-4 sm:px-6 py-3 text-right">ML View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocations.map((a) => {
                const sig = signals?.[a.ticker]
                return (
                  <tr key={a.ticker} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-medium text-gray-900">{a.ticker.replace('.NS', '')}</p>
                      <p className="text-xs text-gray-500">{a.name}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {sig?.signal ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${SIGNAL_BG[sig.signal] || 'bg-gray-100 text-gray-700'}`}>
                          {sig.signal}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right font-semibold text-gray-900">
                      {a.weight_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right font-semibold text-gray-900">
                      {fmtInr(a.amount)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      {sig?.reason ? (
                        <button
                          onClick={() => setModalReason(sig.reason)}
                          className="text-xs font-medium text-[#2a78d6] hover:underline"
                        >
                          Explain →
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2 — Performance Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Expected Return</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{fmtPct(expected_annual_return)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Volatility</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{fmtPct(portfolio_volatility)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sharpe Ratio</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {sharpe_ratio?.toFixed(1)} <span className="text-sm font-medium text-gray-500">({sharpeLabel})</span>
          </p>
        </div>
      </div>

      {/* Section 3 — Scenario Cards */}
      <div className="grid grid-cols-3 gap-4">
        <ScenarioCard
          label="Best Case"
          color="green"
          icon="📈"
          finalValue={scenario.bull}
          capital={data?.scenario ? allocations.reduce((s, a) => s + a.amount, 0) : 0}
        />
        <ScenarioCard
          label="Base Case"
          color="blue"
          icon="📊"
          finalValue={scenario.base}
          capital={data?.scenario ? allocations.reduce((s, a) => s + a.amount, 0) : 0}
        />
        <ScenarioCard
          label="Worst Case"
          color="red"
          icon="📉"
          finalValue={scenario.bear}
          capital={data?.scenario ? allocations.reduce((s, a) => s + a.amount, 0) : 0}
        />
      </div>

      {/* Section 4 — Donut Chart */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Allocation Breakdown</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={220} className="max-w-[260px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-gray-700 font-medium">{d.name}</span>
                  <span className="text-gray-500">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScenarioCard({ label, color, icon, finalValue, capital }) {
  const pctChange = capital > 0 ? ((finalValue - capital) / capital) * 100 : 0
  const borderColor =
    color === 'green' ? 'border-green-200' : color === 'red' ? 'border-red-200' : 'border-blue-200'
  const bgColor =
    color === 'green' ? 'bg-green-50' : color === 'red' ? 'bg-red-50' : 'bg-blue-50'
  const textColor =
    color === 'green' ? 'text-green-800' : color === 'red' ? 'text-red-800' : 'text-blue-800'
  const labelClass =
    color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : 'text-blue-700'

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 sm:p-5`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${labelClass}`}>
        {icon} {label}
      </p>
      <p className={`text-lg sm:text-xl font-bold ${textColor}`}>
        {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
      </p>
      <p className={`text-sm font-medium ${textColor} opacity-80`}>
        → {fmtInr(finalValue)}
      </p>
    </div>
  )
}
