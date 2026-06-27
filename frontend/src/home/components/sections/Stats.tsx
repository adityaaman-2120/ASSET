import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'
import { Divider } from '../ui/Divider'

const stats = [
  { value: '₹2.4Cr+', label: 'Capital Optimized',  sub: 'across active portfolios',    color: '#008080' },
  { value: '78%',      label: 'Win Rate',            sub: 'on BUY signals (last 90d)',   color: '#9a6e3a' },
  { value: '1.8×',     label: 'Average Sharpe',      sub: 'vs 0.9 market average',       color: '#008080' },
  { value: '2,400+',   label: 'Active Investors',    sub: 'trust QuantSense',            color: '#9a6e3a' },
]

const techStack = [
  { label: 'ML Engine',    value: 'XGBoost',                    color: '#008080' },
  { label: 'Optimizer',    value: 'Markowitz / PyPortfolioOpt', color: '#9a6e3a' },
  { label: 'NLP Layer',    value: 'Gemini Pro API',             color: '#008080' },
  { label: 'Market Data',  value: 'Yahoo Finance + NSE India',  color: '#9a6e3a' },
  { label: 'Regime Model', value: 'HMM + Volatility Cluster',   color: '#008080' },
  { label: "Devil's Advocate", value: 'GPT-4 Risk Adversary',   color: '#9a6e3a' },
]

export function Stats() {
  return (
    <section className="py-20 relative overflow-hidden bg-[#ecdcc0]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(0,128,128,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,128,128,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(0,128,128,0.05)_0%,transparent_70%)]" />
      </div>

      <Container>
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-18 animate-fade-up">
          {stats.map((s) => (
            <div key={s.label} className="text-center p-6 rounded-2xl border border-[rgba(0,128,128,0.1)] bg-[rgba(244,225,193,0.5)] hover:border-[rgba(0,128,128,0.3)] hover:shadow-[0_4px_20px_rgba(0,128,128,0.08)] transition-all duration-300 group cursor-default">
              <div className="font-['Syne'] font-extrabold text-4xl mb-1.5 transition-all" style={{ color: s.color }}>{s.value}</div>
              <div className="font-semibold text-sm text-[#0d2b2b]/70 mb-1">{s.label}</div>
              <div className="font-mono text-[9px] text-[#0d2b2b]/35">{s.sub}</div>
            </div>
          ))}
        </div>

        <Divider className="my-14" />

        {/* Tech stack */}
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionLabel label="Under the Hood" />
            <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-4">
              Production-grade quant stack,<span className="grad-teal"> built for scale.</span>
            </h2>
            <p className="text-[#0d2b2b]/50 leading-relaxed mb-7">
              The same techniques used by hedge funds — Markowitz optimization, Hidden Markov Models for regime detection, adversarial AI review — packaged for every retail investor.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['React + Tailwind CSS', 'Python FastAPI', 'XGBoost / sklearn', 'PyPortfolioOpt', 'PostgreSQL', 'Vercel + Railway'].map((t, i) => (
                <div key={t} className="px-3 py-2 rounded-xl font-mono text-[10px] border" style={{ color: i % 2 === 0 ? '#008080' : '#9a6e3a', borderColor: i % 2 === 0 ? 'rgba(0,128,128,0.18)' : 'rgba(154,110,58,0.2)', background: i % 2 === 0 ? 'rgba(0,128,128,0.06)' : 'rgba(154,110,58,0.07)' }}>{t}</div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {techStack.map((t) => (
              <div key={t.label} className="flex items-center justify-between p-4 rounded-2xl border border-[rgba(0,128,128,0.1)] bg-[rgba(244,225,193,0.5)] hover:border-[rgba(0,128,128,0.25)] transition-all duration-200">
                <div className="font-mono text-xs text-[#0d2b2b]/35 w-28 flex-shrink-0">{t.label}</div>
                <div className="flex-1 mx-4 h-px" style={{ background: `${t.color}20` }} />
                <div className="font-['Syne'] font-semibold text-sm" style={{ color: t.color }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
