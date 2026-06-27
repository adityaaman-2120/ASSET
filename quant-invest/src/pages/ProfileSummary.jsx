import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorStore } from '../store/investorStore'
import { api } from '../api/client'

function parseCapital(str) {
  if (!str) return 100000
  if (str.includes('Under')) return 15000
  if (str.includes('25,000')) return 62500
  if (str.includes('1,00,000')) return 300000
  if (str.includes('Above')) return 750000
  return 100000
}

function parseRiskLevel(str) {
  if (!str) return 'medium'
  const s = str.toLowerCase()
  if (s.includes('low') || s.includes('15%') || s.includes('afford')) return 'low'
  if (s.includes('high') || s.includes('reward')) return 'high'
  return 'medium'
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl" style={{ background: 'rgba(0,128,128,0.1)' }} />
        <div className="space-y-2 flex-1">
          <div className="h-4 rounded-lg w-1/3" style={{ background: 'rgba(0,128,128,0.1)' }} />
          <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(0,128,128,0.07)' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl" style={{ background: 'rgba(0,128,128,0.08)' }} />)}
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1,2,3].map(i => <div key={i} className="h-7 w-24 rounded-full" style={{ background: 'rgba(0,128,128,0.1)' }} />)}
      </div>
      <div className="h-3 rounded-lg" style={{ background: 'rgba(0,128,128,0.07)' }} />
      <div className="h-3 rounded-lg w-5/6" style={{ background: 'rgba(0,128,128,0.07)' }} />
      <div className="h-12 rounded-2xl" style={{ background: 'rgba(0,128,128,0.1)' }} />
    </div>
  )
}

function Tag({ label, value }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,128,128,0.05)', border: '1px solid rgba(0,128,128,0.12)' }}>
      <p className="text-xs uppercase mb-1" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.15em' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: '#0d2b2b', fontFamily: 'Space Grotesk, sans-serif' }}>{value || '—'}</p>
    </div>
  )
}

const PIPELINE_STEPS = [
  'Fetching live stock data from NSE…',
  'Running ML signal predictions…',
  'Optimising portfolio with Markowitz…',
  'Generating AI insights…',
  'Strategy ready!',
]

function BuildingStrategy({ currentStep }) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg,#008080,#006666)', boxShadow: '0 4px 20px rgba(0,128,128,0.3)' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
        </div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#0d2b2b', fontSize: '18px' }}>
          Building your strategy…
        </h3>
        <p className="text-xs mt-1" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.4)' }}>
          This takes about 30–60 seconds
        </p>
      </div>
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl transition-all" style={{
            background: done ? 'rgba(0,128,128,0.06)' : active ? 'rgba(0,128,128,0.03)' : 'transparent',
            border: `1px solid ${done ? 'rgba(0,128,128,0.2)' : active ? 'rgba(0,128,128,0.15)' : 'rgba(0,128,128,0.08)'}`,
          }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{
              background: done ? '#008080' : active ? 'rgba(0,128,128,0.1)' : 'rgba(0,128,128,0.05)',
              border: `2px solid ${done ? '#008080' : active ? '#008080' : 'rgba(0,128,128,0.2)'}`,
            }}>
              {done
                ? <span style={{ color: '#F4E1C1', fontSize: '11px' }}>✓</span>
                : active
                ? <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#008080', animation:'pulse-dot 1s infinite' }} />
                : null}
            </div>
            <span className="text-sm" style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: done ? '#008080' : active ? '#0d2b2b' : 'rgba(13,43,43,0.4)',
              fontWeight: active ? 600 : 400,
            }}>{step}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ProfileSummary() {
  const navigate = useNavigate()
  const profile    = useInvestorStore(s => s.profile)
  const setProfile = useInvestorStore(s => s.setProfile)
  const setPortfolio = useInvestorStore(s => s.setPortfolio)
  const setStocks    = useInvestorStore(s => s.setStocks)
  const setSignals   = useInvestorStore(s => s.setSignals)

  const [loading, setLoading]       = useState(true)
  const [summary, setSummary]       = useState(null)
  const [error, setError]           = useState(null)
  const [building, setBuilding]     = useState(false)
  const [buildStep, setBuildStep]   = useState(0)
  const [buildError, setBuildError] = useState(null)

  // Step 1: Groq profile summary
  useEffect(() => {
    if (!profile) { navigate('/'); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 400,
            messages: [
              { role: 'system', content: 'Return ONLY a valid JSON object with these keys: displayCapital (string), riskLabel (string like "Medium Risk"), horizonLabel (string), sectorsList (array of strings), styleLabel (string), summaryParagraph (2 warm sentences).' },
              { role: 'user', content: `Investor data: ${JSON.stringify(profile)}. Generate the profile JSON.` },
            ],
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        let raw = data.choices?.[0]?.message?.content || ''
        raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(raw)
        if (!cancelled) { setSummary(parsed); setProfile({ ...profile, summary: parsed }) }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Step 2: Full pipeline on button click
  const handleBuildStrategy = async () => {
    setBuilding(true)
    setBuildStep(0)
    setBuildError(null)
    try {
      const sectors = (profile.sectors || []).filter(s => s !== 'No preference — show all')
      const useSectors = sectors.length > 0 ? sectors : ['Technology', 'Banking and Finance']
      const capital = parseCapital(profile.capital)
      const riskLevel = parseRiskLevel(profile.risk)

      // 0 — fetch stocks
      setBuildStep(0)
      const stocksRes = await api.post('/api/fetch-stocks', { sectors: useSectors, period: '6mo' })
      const stocks = stocksRes.data.stocks || []
      setStocks(stocks)

      // 1 — predict signals
      setBuildStep(1)
      let signals = []
      if (stocks.length > 0) {
        try {
          const payload = stocks.map(s => ({
            ticker: s.ticker,
            features: {
              rsi_14: s.indicators?.rsi_14 ?? 50,
              macd_diff: s.indicators?.macd_diff ?? 0,
              bb_pct: s.indicators?.bb_pct ?? 0.5,
              price_vs_50ma: s.indicators?.price_vs_50ma ?? 0,
              price_vs_200ma: s.indicators?.price_vs_200ma ?? 0,
              volume_ratio: s.indicators?.volume_ratio ?? 1,
              ret_7d: s.change_pct_7d ?? 0,
              ret_1d: s.change_pct_1d ?? 0,
              volatility_20d: s.indicators?.volatility_20d ?? 0.15,
            },
          }))
          const sigRes = await api.post('/api/predict-signals', { stocks: payload })
          signals = sigRes.data.predictions || []
        } catch (_) { signals = [] }
        setSignals(signals)
      }

      // 2 — optimise portfolio
      setBuildStep(2)
      const signalMap = {}
      signals.forEach(s => { signalMap[s.ticker] = s })
      const buyTickers = signals.filter(s => s.signal === 'BUY').map(s => s.ticker)
      const candidateTickers = buyTickers.length >= 3
        ? buyTickers.slice(0, 10)
        : stocks.sort((a, b) => (b.change_pct_7d ?? 0) - (a.change_pct_7d ?? 0)).slice(0, 10).map(s => s.ticker)

      const optRes = await api.post('/api/optimize-portfolio', { tickers: candidateTickers, capital, risk_level: riskLevel })
      const portfolio = optRes.data

      // enrich allocations with signal + indicator data
      const stockMap = {}
      stocks.forEach(s => { stockMap[s.ticker] = s })
      portfolio.allocations = (portfolio.allocations || []).map(a => ({
        ...a,
        signal: signalMap[a.ticker]?.signal || 'HOLD',
        confidence: signalMap[a.ticker]?.confidence || 0,
        reason: signalMap[a.ticker]?.reason || '',
        indicators: stockMap[a.ticker]?.indicators || {},
        close_prices: stockMap[a.ticker]?.close_prices || [],
        change_pct_1d: stockMap[a.ticker]?.change_pct_1d || 0,
        change_pct_7d: stockMap[a.ticker]?.change_pct_7d || 0,
        high_52w: stockMap[a.ticker]?.high_52w || 0,
        low_52w: stockMap[a.ticker]?.low_52w || 0,
      }))

      // 3 — generate insights
      setBuildStep(3)
      try {
        const insightPayload = portfolio.allocations.map(a => ({
          ticker: a.ticker, name: a.name,
          signal: a.signal, confidence: a.confidence,
          change_pct_1d: a.change_pct_1d,
          rsi_value: a.indicators?.rsi_14 || 50,
          composite_score: a.confidence || 0,
          weight_pct: a.weight_pct,
        }))
        const insRes = await api.post('/api/generate-insights', {
          portfolio: insightPayload,
          portfolio_value: capital,
          invested_capital: capital,
        })
        portfolio.insights = insRes.data.insights || []
      } catch (_) { portfolio.insights = [] }

      setPortfolio(portfolio)
      setBuildStep(4)
      await new Promise(r => setTimeout(r, 700))
      navigate('/dashboard')
    } catch (err) {
      setBuildError(err.message || 'Something went wrong. Make sure the backend is running on port 5173.')
      setBuilding(false)
    }
  }

  if (!profile) return null

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8" style={{ background: '#F4E1C1' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
      }} />

      <div className="relative w-full max-w-lg">
        <div className="mb-6">
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', color: '#0d2b2b', letterSpacing: '-0.02em' }}>
            {building ? 'Building Your Strategy' : 'Your Profile Summary'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(13,43,43,0.45)', fontFamily: 'Space Mono, monospace' }}>
            {building ? 'Hang tight while we crunch the numbers' : "Here's what we understand about you"}
          </p>
        </div>

        <div className="rounded-3xl p-6 sm:p-8" style={{
          background: 'rgba(244,225,193,0.85)',
          border: '1px solid rgba(0,128,128,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,128,128,0.08)',
        }}>
          {building ? (
            <BuildingStrategy currentStep={buildStep} />
          ) : loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#008080,#006666)', boxShadow: '0 4px 16px rgba(0,128,128,0.3)' }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#F4E1C1', fontSize: '18px' }}>You</span>
                </div>
                <div>
                  <p className="font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: '#0d2b2b', fontSize: '15px' }}>Your Investor Profile</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(13,43,43,0.45)', fontFamily: 'Space Mono, monospace' }}>
                    {summary?.styleLabel || profile?.investorType}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Tag label="Capital"          value={summary?.displayCapital || profile?.capital} />
                <Tag label="Risk Level"       value={summary?.riskLabel || profile?.risk} />
                <Tag label="Time Horizon"     value={summary?.horizonLabel || profile?.horizon} />
                <Tag label="Investment Style" value={summary?.styleLabel || profile?.investorType} />
              </div>

              <div>
                <p className="text-xs uppercase mb-3" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.4)', letterSpacing: '0.15em' }}>Sectors</p>
                <div className="flex flex-wrap gap-2">
                  {(summary?.sectorsList || profile?.sectors || []).map(s => (
                    <span key={s} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(0,128,128,0.08)', color: '#008080', border: '1px solid rgba(0,128,128,0.2)', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(0,128,128,0.1)' }} />

              {summary?.summaryParagraph && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(13,43,43,0.6)', fontStyle: 'italic', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {summary.summaryParagraph}
                </p>
              )}

              {error && (
                <p className="text-xs p-3 rounded-xl" style={{ color: '#9a6e3a', background: 'rgba(154,110,58,0.08)', border: '1px solid rgba(154,110,58,0.2)', fontFamily: 'Space Mono, monospace' }}>
                  AI summary unavailable — your profile data was captured. You can still proceed.
                </p>
              )}

              {buildError && (
                <p className="text-xs p-3 rounded-xl" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'Space Mono, monospace' }}>
                  {buildError}
                </p>
              )}

              <button
                onClick={handleBuildStrategy}
                className="w-full py-3.5 px-6 text-sm font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98]"
                style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 4px 24px rgba(0,128,128,0.3)', fontFamily: 'Space Grotesk, sans-serif' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#006666' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}
              >
                See My Strategy →
              </button>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.28)', letterSpacing: '0.1em' }}>
          NOT SEBI REGISTERED · EDUCATIONAL USE ONLY
        </p>
      </div>
    </div>
  )
}
