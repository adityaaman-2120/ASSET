import { UserCircle, Database, Cpu, PieChart, LayoutDashboard } from 'lucide-react'
import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'

const phases = [
  {
    num: '00', phase: 'Phase 0', icon: UserCircle, color: '#008080',
    title: 'Investor Profiling',
    desc: 'Structured onboarding that feels like a conversation — capital, risk tolerance, time horizon, sectors, and a free-text goal you type in plain English.',
    details: ['Capital & Risk', 'Time Horizon', 'Sector Interest', 'Investment Style', 'NLP Goal Input'],
  },
  {
    num: '01', phase: 'Phase 1', icon: Database, color: '#9a6e3a',
    title: 'Market Data Pipeline',
    desc: 'Real-time OHLCV data, P/E ratios, sector classification, and news sentiment — pulled from Yahoo Finance, Alpha Vantage, and NSE India APIs.',
    details: ['Live OHLCV data', '52-week highs/lows', 'Sector heatmaps', 'News sentiment', 'Volume analysis'],
  },
  {
    num: '02', phase: 'Phase 2', icon: Cpu, color: '#008080',
    title: 'ML Prediction Engine',
    desc: 'XGBoost model trained on RSI, MACD, volume spikes, and sector momentum. Outputs Buy / Hold / Sell signals with a confidence % and plain-English reason.',
    details: ['RSI + MACD signals', 'Volume confirmation', 'Sector momentum', 'Confidence scoring', 'Plain-English reason'],
  },
  {
    num: '03', phase: 'Phase 3', icon: PieChart, color: '#9a6e3a',
    title: 'Portfolio Optimization',
    desc: "Markowitz efficient frontier finds the mathematically optimal allocation. Devil's Advocate AI then attacks the result to catch hidden risks.",
    details: ['Efficient frontier', 'Sharpe maximization', 'Risk-adjusted return', "Devil's Advocate review", 'Scenario analysis'],
  },
  {
    num: '04', phase: 'Phase 4', icon: LayoutDashboard, color: '#008080',
    title: 'Live Dashboard',
    desc: 'Your portfolio, live. AI insight feed in plain English, rebalance suggestions, goal tracking, and the "What If" simulator — all in one place.',
    details: ['Live portfolio value', 'AI insight feed', 'Rebalance alerts', 'Goal progress', '"What If" simulator'],
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 relative overflow-hidden bg-[#ecdcc0]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.15)] to-transparent" />
        <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,128,128,0.06)_0%,transparent_70%)]" />
      </div>

      <Container>
        <div className="max-w-xl mb-14 animate-fade-up">
          <SectionLabel label="How It Works" color="sand" />
          <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
            From your goal to a
            <span className="grad-teal"> live portfolio</span>
            <br />in five phases.
          </h2>
          <p className="text-[#0d2b2b]/50 text-base">
            A rigorous quant pipeline — transparent at every step.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="hidden lg:block absolute left-[180px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(0,128,128,0.25)] to-transparent" />

          <div className="space-y-1">
            {phases.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={p.num} className={`group grid lg:grid-cols-[180px_1fr] gap-6 items-start animate-fade-up delay-${(i+1)*100}`}>
                  <div className="hidden lg:flex flex-col items-end pr-8 pt-5 gap-0.5">
                    <span className="font-['Syne'] font-bold text-3xl opacity-15 group-hover:opacity-50 transition-all duration-300" style={{ color: p.color }}>{p.num}</span>
                    <span className="font-mono text-[8px] tracking-widest uppercase text-[#0d2b2b]/25">{p.phase}</span>
                  </div>

                  <div className="hidden lg:flex absolute w-3 h-3 rounded-full border-2 border-[#ecdcc0] z-10 group-hover:scale-150 transition-transform duration-300 top-[26px]" style={{ left: '175px', background: p.color }} />

                  <div className="lg:pl-10 py-3">
                    <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 cursor-default"
                      style={{ background: `${p.color}07`, borderColor: `${p.color}18` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${p.color}35`; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${p.color}12` }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${p.color}18`; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}12`, border: `1px solid ${p.color}22` }}>
                          <Icon size={16} style={{ color: p.color }} />
                        </div>
                        <div>
                          <span className="lg:hidden font-mono text-[8px] tracking-widest uppercase text-[#0d2b2b]/25">{p.phase} · </span>
                          <h3 className="font-['Syne'] font-bold text-lg text-[#0d2b2b]">{p.title}</h3>
                        </div>
                      </div>
                      <p className="text-[#0d2b2b]/50 text-sm leading-relaxed mb-4">{p.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.details.map((d, di) => (
                          <span key={d} className="px-2.5 py-1 rounded-lg text-xs font-mono"
                            style={{ color: di % 2 === 0 ? `${p.color}cc` : '#0d2b2b77', background: di % 2 === 0 ? `${p.color}0d` : 'rgba(13,43,43,0.04)', border: `1px solid ${di % 2 === 0 ? p.color + '20' : 'rgba(13,43,43,0.06)'}` }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
