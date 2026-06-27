import { TrendingDown, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'

const signals = [
  {
    ticker: 'TCS', name: 'Tata Consultancy', signal: 'BUY', conf: 78, price: '₹3,842', change: '+1.2%',
    reason: 'RSI recovering from oversold zone. MACD bullish crossover detected. Strong IT sector momentum with institutional inflows.',
    indicators: { RSI: '38 → Recovering', MACD: 'Bullish crossover', BB: 'Near lower band', MA: 'Above 200-day' },
  },
  {
    ticker: 'SUN', name: 'Sun Pharma', signal: 'HOLD', conf: 61, price: '₹1,205', change: '+0.4%',
    reason: 'Crossed 50-day moving average — bullish breakout signal. Volume below average, wait for confirmation.',
    indicators: { RSI: '54 Neutral', MACD: 'Flat', BB: 'Mid-band', MA: 'Just crossed 50-day' },
  },
  {
    ticker: 'HDFC', name: 'HDFC Bank', signal: 'BUY', conf: 71, price: '₹1,680', change: '+2.1%',
    reason: 'Banking sector showing strong momentum. Earnings beat last quarter. RSI at 52 — healthy with room for upside.',
    indicators: { RSI: '52 Healthy', MACD: 'Rising', BB: 'Lower half', MA: 'Above all MAs' },
  },
]

const signalColors: Record<string, { text: string; bg: string; border: string }> = {
  BUY:  { text: '#008080', bg: 'rgba(0,128,128,0.1)',  border: 'rgba(0,128,128,0.25)' },
  HOLD: { text: '#9a6e3a', bg: 'rgba(154,110,58,0.1)', border: 'rgba(154,110,58,0.25)' },
  SELL: { text: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' },
}

const insightFeed = [
  { icon: AlertTriangle, color: '#9a6e3a', text: 'TCS showing overbought signals — consider booking partial profit', time: '2m ago' },
  { icon: CheckCircle2,  color: '#008080', text: 'Sun Pharma crossed 50-day MA — bullish breakout detected', time: '8m ago' },
  { icon: TrendingDown,  color: '#dc2626', text: 'Banking sector under pressure today — monitor HDFC Bank closely', time: '15m ago' },
  { icon: Info,          color: '#9a6e3a', text: 'Portfolio Sharpe Ratio improved to 1.9 — excellent risk-return balance', time: '1h ago' },
  { icon: CheckCircle2,  color: '#008080', text: 'Regime Detection: Market is in Bull phase with moderate volatility', time: '2h ago' },
]

export function Intelligence() {
  return (
    <section id="intelligence" className="py-20 relative overflow-hidden bg-[#ecdcc0]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />
        <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,128,128,0.06)_0%,transparent_70%)]" />
      </div>

      <Container>
        <div className="max-w-xl mb-12 animate-fade-up">
          <SectionLabel label="AI Intelligence" />
          <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
            Every signal explained.<span className="grad-teal"> In your language.</span>
          </h2>
          <p className="text-[#0d2b2b]/50 text-base">
            Every ML prediction comes with a plain-English reason plus the raw indicators for those who want to dig deeper.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          {signals.map((s) => {
            const sc = signalColors[s.signal]
            return (
              <div key={s.ticker} className="rounded-2xl overflow-hidden border border-[rgba(0,128,128,0.1)] bg-[rgba(244,225,193,0.5)] hover:border-[rgba(0,128,128,0.25)] hover:shadow-[0_4px_20px_rgba(0,128,128,0.08)] transition-all duration-300 group">
                <div className="px-5 py-4 border-b border-[rgba(0,128,128,0.08)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{s.ticker[0]}</div>
                    <div>
                      <div className="font-['Syne'] font-bold text-sm text-[#0d2b2b]">{s.ticker}</div>
                      <div className="font-mono text-[8px] text-[#0d2b2b]/35">{s.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-['Syne'] font-bold text-sm text-[#0d2b2b]">{s.price}</div>
                    <div className="font-mono text-[8px] text-[#008080]">{s.change}</div>
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-[rgba(0,128,128,0.06)]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold" style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                      {s.signal === 'BUY' ? '↑ ' : s.signal === 'SELL' ? '↓ ' : '→ '}{s.signal}
                    </span>
                    <span className="font-mono text-xs text-[#0d2b2b]/35">{s.conf}% confidence</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(0,128,128,0.1)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.conf}%`, background: `linear-gradient(90deg, ${sc.text}80, ${sc.text})` }} />
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-[rgba(0,128,128,0.06)]">
                  <div className="font-mono text-[8px] tracking-widest uppercase text-[#0d2b2b]/25 mb-1.5">AI Reasoning</div>
                  <p className="text-xs text-[#0d2b2b]/55 leading-relaxed">{s.reason}</p>
                </div>

                <div className="px-5 py-3">
                  <div className="space-y-1">
                    {Object.entries(s.indicators).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#0d2b2b]/30">{k}</span>
                        <span className="text-[#0d2b2b]/55">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button className="w-full py-2 rounded-xl text-xs font-medium transition-all duration-200 border border-[rgba(0,128,128,0.15)] text-[#008080]/60 hover:border-[rgba(0,128,128,0.4)] hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)]">
                    Explain This To Me →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Insight Feed */}
        <div className="rounded-3xl border border-[rgba(0,128,128,0.12)] bg-[rgba(244,225,193,0.6)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(0,128,128,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#008080] ripple" />
              <span className="font-['Syne'] font-semibold text-[#0d2b2b] text-sm ml-2">AI Insight Feed</span>
            </div>
            <span className="font-mono text-[8px] text-[#0d2b2b]/25 tracking-widest uppercase">Live</span>
          </div>
          <div className="divide-y divide-[rgba(0,128,128,0.06)]">
            {insightFeed.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-start gap-4 px-6 py-3.5 hover:bg-[rgba(0,128,128,0.04)] transition-all duration-200">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}>
                    <Icon size={12} style={{ color: item.color }} />
                  </div>
                  <p className="flex-1 text-sm text-[#0d2b2b]/60 leading-relaxed">{item.text}</p>
                  <span className="font-mono text-[8px] text-[#0d2b2b]/25 flex-shrink-0 mt-1">{item.time}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
