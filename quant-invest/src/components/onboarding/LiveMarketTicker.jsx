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
  const [index, setIndex]           = useState(null)
  const [stocks, setStocks]         = useState([])
  const [gainers, setGainers]       = useState([])
  const [losers, setLosers]         = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError]           = useState(null)
  const [collapsed, setCollapsed]   = useState(false)
  const intervalRef = useRef(null)

  const fetchData = async () => {
    try {
      const res = await api.get('/api/market-summary')
      const d = res.data
      setIndex(d.index)
      setStocks(d.stocks || [])
      setGainers(d.gainers || [])
      setLosers(d.losers || [])
      setLastUpdated(d.last_updated)
      setError(null)
    } catch (e) {
      setError('Could not load market data')
    }
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(0,128,128,0.15)', background: 'rgba(244,225,193,0.6)' }}>

      {/* header row */}
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3 transition-colors"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(0,128,128,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#16a34a', animation: 'pulse-dot 2s infinite', display: 'inline-block' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: '#0d2b2b' }}>Live Market</span>
          {lastUpdated && (
            <span className="text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.35)' }}>{timeAgo(lastUpdated)}</span>
          )}
        </div>
        <span className="text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.4)' }}>{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="p-4 sm:p-5 space-y-4">

          {error ? (
            <p className="text-xs p-3 rounded-xl" style={{ color: '#9a6e3a', background: 'rgba(154,110,58,0.08)', border: '1px solid rgba(154,110,58,0.2)', fontFamily: 'Space Mono, monospace' }}>
              {error}
            </p>
          ) : (
            <>
              {/* NIFTY index strip */}
              {index && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(0,128,128,0.05)', border: '1px solid rgba(0,128,128,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.5)', letterSpacing: '0.1em' }}>NIFTY 50</span>
                    <span className="text-xs font-semibold" style={{ color: index.change_percent >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'Space Mono, monospace' }}>
                      {index.change_percent >= 0 ? '▲' : '▼'} {Math.abs(index.change_percent).toFixed(2)}%
                    </span>
                  </div>
                  <span className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#0d2b2b', fontSize: '15px' }}>{fmtInr(index.last_price)}</span>
                </div>
              )}

              {/* Top gainers */}
              {gainers.length > 0 && (
                <div>
                  <p className="text-xs uppercase mb-2" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.15em' }}>Top Gainers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {gainers.map(s => (
                      <div key={s.symbol} className="p-2.5 rounded-xl" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.18)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#0d2b2b', fontFamily: 'Space Grotesk, sans-serif' }}>{s.symbol}</p>
                        <p className="text-xs font-bold" style={{ color: '#16a34a', fontFamily: 'Space Mono, monospace' }}>+{s.change_percent.toFixed(2)}%</p>
                        <p className="text-[11px]" style={{ color: 'rgba(13,43,43,0.45)', fontFamily: 'Space Mono, monospace' }}>{fmtInr(s.last_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top losers */}
              {losers.length > 0 && (
                <div>
                  <p className="text-xs uppercase mb-2" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.15em' }}>Top Losers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {losers.map(s => (
                      <div key={s.symbol} className="p-2.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#0d2b2b', fontFamily: 'Space Grotesk, sans-serif' }}>{s.symbol}</p>
                        <p className="text-xs font-bold" style={{ color: '#dc2626', fontFamily: 'Space Mono, monospace' }}>{s.change_percent.toFixed(2)}%</p>
                        <p className="text-[11px]" style={{ color: 'rgba(13,43,43,0.45)', fontFamily: 'Space Mono, monospace' }}>{fmtInr(s.last_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stocks table */}
              {stocks.length > 0 && (
                <div className="overflow-x-auto -mx-4 sm:-mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,128,128,0.1)' }}>
                        {['Symbol', 'LTP', 'Change', '%'].map((h, i) => (
                          <th key={h} className={`py-2 text-xs uppercase ${i === 0 ? 'text-left px-5' : 'text-right px-4'} ${i === 3 ? 'pr-5' : ''}`}
                            style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.38)', letterSpacing: '0.1em', fontWeight: 500 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map(s => (
                        <tr key={s.symbol} style={{ borderBottom: '1px solid rgba(0,128,128,0.06)' }}>
                          <td className="px-5 py-2.5">
                            <p className="font-semibold text-xs" style={{ color: '#0d2b2b', fontFamily: 'Space Grotesk, sans-serif' }}>{s.symbol}</p>
                            {s.name && <p className="text-[11px]" style={{ color: 'rgba(13,43,43,0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>{s.name}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: '#0d2b2b', fontFamily: 'Space Mono, monospace' }}>
                            {fmtInr(s.last_price)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: s.change >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'Space Mono, monospace' }}>
                            {s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold pr-5" style={{ color: s.change_percent >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'Space Mono, monospace' }}>
                            {s.change_percent >= 0 ? '▲' : '▼'} {Math.abs(s.change_percent).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
