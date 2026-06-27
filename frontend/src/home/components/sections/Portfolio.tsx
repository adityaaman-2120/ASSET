import { PieChart, TrendingUp, AlertCircle } from 'lucide-react'
import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'

const allocations = [
  { ticker: 'TCS',   name: 'Tata Consultancy', pct: 25, amount: '₹18,750', signal: 'BUY',  color: '#008080' },
  { ticker: 'HDFC',  name: 'HDFC Bank',        pct: 20, amount: '₹15,000', signal: 'BUY',  color: '#9a6e3a' },
  { ticker: 'SUN',   name: 'Sun Pharma',       pct: 15, amount: '₹11,250', signal: 'HOLD', color: '#008080' },
  { ticker: 'INFO',  name: 'Infosys',          pct: 15, amount: '₹11,250', signal: 'BUY',  color: '#9a6e3a' },
  { ticker: 'REL',   name: 'Reliance',         pct: 13, amount: '₹9,750',  signal: 'BUY',  color: '#008080' },
  { ticker: 'ICICI', name: 'ICICI Bank',       pct: 12, amount: '₹9,000',  signal: 'HOLD', color: '#9a6e3a' },
]

const scenarios = [
  { label: 'Best Case',  sub: 'Bull Market',   pct: '+24%', val: '₹93,000', color: '#008080', w: '100%' },
  { label: 'Base Case',  sub: 'Normal Market', pct: '+16%', val: '₹87,000', color: '#9a6e3a', w: '67%' },
  { label: 'Worst Case', sub: 'Bear Market',   pct: '-12%', val: '₹66,000', color: '#dc2626', w: '50%' },
]

export function Portfolio() {
  return (
    <section id="simulator" className="py-20 relative overflow-hidden bg-[#F4E1C1]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(154,110,58,0.06)_0%,transparent_70%)]" />
      </div>

      <Container>
        <div className="max-w-xl mb-12 animate-fade-up">
          <SectionLabel label="Portfolio Optimizer" color="sand" />
          <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
            Mathematically optimal.<span className="grad-sand"> Personally yours.</span>
          </h2>
          <p className="text-[#0d2b2b]/50 text-base">
            Markowitz efficient frontier finds the perfect allocation. Then the Devil's Advocate AI challenges it to protect you from hidden risks.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Allocation card */}
          <div className="rounded-3xl border border-[rgba(154,110,58,0.2)] bg-[rgba(244,225,193,0.6)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[rgba(154,110,58,0.1)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <PieChart size={15} className="text-[#9a6e3a]" />
                  <span className="font-['Syne'] font-bold text-[#0d2b2b]">Optimized Portfolio</span>
                </div>
                <div className="font-mono text-[8px] text-[#0d2b2b]/30">Capital: ₹75,000 · Risk: Medium</div>
              </div>
              <div className="text-right">
                <div className="font-['Syne'] font-bold text-2xl text-[#008080]">+16.4%</div>
                <div className="font-mono text-[8px] text-[#0d2b2b]/30">Expected annual</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="px-6 py-4 border-b border-[rgba(154,110,58,0.06)]">
              <div className="space-y-2">
                {allocations.map((a) => (
                  <div key={a.ticker} className="flex items-center gap-3">
                    <div className="w-9 font-mono text-[8px] text-[#0d2b2b]/40 flex-shrink-0">{a.ticker}</div>
                    <div className="flex-1 h-4 bg-[rgba(0,128,128,0.08)] rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg flex items-center px-2" style={{ width: `${a.pct * 4}%`, background: `linear-gradient(90deg, ${a.color}60, ${a.color}35)`, border: `1px solid ${a.color}20` }}>
                        <span className="font-mono text-[7px]" style={{ color: `${a.color}cc` }}>{a.pct}%</span>
                      </div>
                    </div>
                    <div className="font-mono text-[8px] text-[#0d2b2b]/45 w-14 text-right">{a.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock rows */}
            <div className="divide-y divide-[rgba(0,128,128,0.05)]">
              {allocations.map((a) => (
                <div key={a.ticker} className="flex items-center justify-between px-6 py-3 hover:bg-[rgba(0,128,128,0.04)] transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${a.color}12`, color: a.color, border: `1px solid ${a.color}22` }}>{a.ticker[0]}</div>
                    <div>
                      <div className="text-sm font-medium text-[#0d2b2b]/80">{a.name}</div>
                      <div className="font-mono text-[8px] text-[#0d2b2b]/30">{a.pct}% allocation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-[#0d2b2b]/45">{a.amount}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[8px] font-bold" style={{ color: a.signal === 'BUY' ? '#008080' : '#9a6e3a', background: a.signal === 'BUY' ? 'rgba(0,128,128,0.1)' : 'rgba(154,110,58,0.1)' }}>{a.signal}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 grid grid-cols-3 gap-4 bg-[rgba(0,128,128,0.04)]">
              {[
                { label: 'Sharpe Ratio', value: '1.8',  color: '#008080' },
                { label: 'Risk Score',   value: '0.42', color: '#0d2b2b' },
                { label: 'Max Drawdown', value: '-12%', color: '#0d2b2b' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div className="font-['Syne'] font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
                  <div className="font-mono text-[7px] text-[#0d2b2b]/30 uppercase tracking-widest">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            {/* Scenarios */}
            <div className="rounded-3xl border border-[rgba(0,128,128,0.12)] bg-[rgba(244,225,193,0.6)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={15} className="text-[#008080]" />
                <span className="font-['Syne'] font-bold text-[#0d2b2b] text-sm">Scenario Analysis</span>
              </div>
              <div className="space-y-4">
                {scenarios.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-[#0d2b2b]/75">{s.label}</span>
                        <span className="ml-2 font-mono text-[8px] text-[#0d2b2b]/30">{s.sub}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-['Syne'] font-bold text-base" style={{ color: s.color }}>{s.pct}</span>
                        <span className="ml-2 font-mono text-xs text-[#0d2b2b]/40">{s.val}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[rgba(0,128,128,0.1)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: s.w, background: `linear-gradient(90deg, ${s.color}80, ${s.color})` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#0d2b2b]/30 font-mono">Max downside protected at ₹9,000 based on your risk tolerance.</p>
            </div>

            {/* Devil's advocate */}
            <div className="rounded-3xl border border-[rgba(0,128,128,0.2)] bg-[rgba(0,128,128,0.05)] p-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={15} className="text-[#008080]" />
                <span className="font-['Syne'] font-bold text-[#0d2b2b] text-sm">Devil's Advocate Report</span>
              </div>
              <p className="font-mono text-[8px] text-[#0d2b2b]/30 mb-4">Second AI reviewing your portfolio for hidden risks</p>
              <div className="space-y-2.5">
                {[
                  { title: 'Tech concentration', desc: 'TCS + Infosys = 40% in IT. A sector correction would hit both simultaneously.', color: '#9a6e3a' },
                  { title: 'Interest rate sensitivity', desc: 'HDFC + ICICI = 32% in banking. Rate hikes increase funding costs — monitor RBI policy.', color: '#c44' },
                  { title: 'Diversification: Resolved', desc: 'Three sectors represented. No single stock exceeds 25% cap. Sharpe ratio 1.8 — well balanced.', color: '#008080' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-3.5 rounded-2xl" style={{ background: `${item.color}08`, border: `1px solid ${item.color}18` }}>
                    <div className="w-1 flex-shrink-0 rounded-full self-stretch" style={{ background: item.color }} />
                    <div>
                      <div className="text-sm font-semibold text-[#0d2b2b]/80 mb-0.5">{item.title}</div>
                      <p className="text-xs text-[#0d2b2b]/45 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rebalance */}
            <div className="rounded-2xl border border-[rgba(0,128,128,0.12)] bg-[rgba(244,225,193,0.5)] p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-['Syne'] font-semibold text-sm text-[#0d2b2b] mb-1">Rebalance Suggestion</div>
                <p className="text-xs text-[#0d2b2b]/45">Tech grew to 45%. Consider trimming 10% into Pharma for better diversification.</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button className="px-4 py-2 rounded-xl text-xs font-medium bg-[#008080] text-[#F4E1C1] hover:bg-[#006666] transition-all whitespace-nowrap">Rebalance Now</button>
                <button className="px-4 py-2 rounded-xl text-xs font-medium border border-[rgba(0,128,128,0.2)] text-[#0d2b2b]/50 hover:border-[rgba(0,128,128,0.35)] transition-all whitespace-nowrap">Remind Me Later</button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
