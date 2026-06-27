import { useEffect, useState, useRef } from 'react'
import { api } from '../../api/client'

function fmtInr(n) {
  if (n == null || isNaN(n)) return '—'
  return '₹' + Number(n.toFixed(0)).toLocaleString('en-IN')
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function LiveMarketTicker() {
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(null)
  const [stocks, setStocks] = useState([])
  const [gainers, setGainers] = useState([])
  const [losers, setLosers] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const intervalRef = useRef(null)

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const res = await api.get('/api/market-summary')
      const data = res.data
      setIndex(data.index)
      setStocks(data.stocks || [])
      setGainers(data.gainers || [])
      setLosers(data.losers || [])
      setLastUpdated(data.last_updated)
      setError(null)
    } catch (e) {
      setError('Could not load market data')
      console.error('Market summary fetch failed', e)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(false)
    intervalRef.current = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-gray-900">Live Market</span>
          {lastUpdated && (
            <span className="text-xs text-gray-400">{timeAgo(lastUpdated)}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs text-gray-500 font-medium animate-pulse">Loading live market prices...</p>
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg p-3 border border-red-200">
              {error}
            </p>
          ) : (
            <>
              {index && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">NIFTY 50</span>
                    <span className={`text-xs font-semibold ${index.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {index.change_percent >= 0 ? '▲' : '▼'} {Math.abs(index.change_percent).toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-base font-bold text-gray-900">{fmtInr(index.last_price)}</span>
                </div>
              )}

              {gainers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Gainers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {gainers.map((s) => (
                      <div key={s.symbol} className="p-2 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-xs font-semibold text-gray-900">{s.symbol}</p>
                        <p className="text-xs font-bold text-green-600">+{s.change_percent.toFixed(2)}%</p>
                        <p className="text-[11px] text-gray-500">{fmtInr(s.last_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {losers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Losers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {losers.map((s) => (
                      <div key={s.symbol} className="p-2 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-xs font-semibold text-gray-900">{s.symbol}</p>
                        <p className="text-xs font-bold text-red-600">{s.change_percent.toFixed(2)}%</p>
                        <p className="text-[11px] text-gray-500">{fmtInr(s.last_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto -mx-4 sm:-mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Symbol</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">LTP</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Change</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide pr-5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((s) => (
                      <tr key={s.symbol} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-gray-900">{s.symbol}</p>
                          <p className="text-[11px] text-gray-400 leading-tight">{s.name}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                          {fmtInr(s.last_price)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${s.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold pr-5 ${s.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="inline-flex items-center gap-0.5">
                            {s.change_percent >= 0 ? '▲' : '▼'} {Math.abs(s.change_percent).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
