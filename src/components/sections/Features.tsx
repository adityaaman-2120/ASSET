import { Brain, Shield, MessageSquare, Target, Zap, BarChart3, TrendingUp, Bell, FlaskConical, LineChart, Layers, Compass } from 'lucide-react'
import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'
import { Badge } from '../ui/Badge'

const crown = [
  {
    id: 'regime', icon: Compass, badge: 'Crown Jewel', badgeVariant: 'sand' as const,
    title: 'Regime Detection',
    tagline: "Check the market's mood before investing.",
    desc: "Before building anything, the system identifies what kind of market you're in — Bull, Bear, High-Volatility, or Sideways. In calm markets we go aggressive; in stormy ones we go defensive.",
    chips: ['Bull market', 'Bear market', 'High volatility', 'Sideways'],
    accentColor: '#9a6e3a',
    bg: 'clay-gold',
  },
  {
    id: 'devil', icon: Shield, badge: 'Crown Jewel', badgeVariant: 'teal' as const,
    title: "Devil's Advocate Agent",
    tagline: 'Our AI argues with itself to protect you.',
    desc: 'After the system builds a portfolio, a second AI steps in to attack it. It probes concentration risk, hidden correlations, and macro vulnerabilities — then reports before you invest.',
    chips: ['Concentration risk', 'Correlation traps', 'Macro exposure', 'Sector overlap'],
    accentColor: '#008080',
    bg: 'clay',
  },
  {
    id: 'nlp', icon: MessageSquare, badge: 'Unique', badgeVariant: 'teal' as const,
    title: 'NL Constraint Compiler',
    tagline: 'Talk to it like a human; it does the math.',
    desc: 'Type "invest 5 lakhs, aggressive, no fossil fuels, max 15% in one stock" and the system converts your sentence into exact mathematical optimizer constraints.',
    chips: null,
    demo: '"No fossil fuels, max 15% per stock, aggressive" → w_ONGC=0, w_i≤0.15, σ_target=high',
    accentColor: '#008080',
    bg: 'clay',
  },
]

const standard = [
  { icon: Brain,      title: 'ML Prediction Engine',  desc: 'XGBoost produces Buy / Hold / Sell signals with confidence scores and a plain-English reason for every call.',          color: '#008080' },
  { icon: BarChart3,  title: 'Markowitz Optimizer',   desc: 'Mathematically perfect capital allocation across your shortlisted stocks to maximise return for your risk level.',      color: '#9a6e3a' },
  { icon: Layers,     title: 'Technical Indicators',  desc: 'RSI, MACD, Bollinger Bands, Moving Averages — computed automatically and translated into human-readable insights.',       color: '#008080' },
  { icon: FlaskConical, title: '"What If" Simulator', desc: '"What if I add ₹10K to Reliance?" Instantly models how it shifts return, risk score, and Sharpe Ratio.',              color: '#9a6e3a' },
  { icon: Target,     title: 'Goal Tracker',          desc: 'Set a goal — "₹90,000 in 12 months" — and the platform tracks progress, projects outcomes, and alerts on drift.',      color: '#008080' },
  { icon: Bell,       title: 'Behavior Warnings',     desc: 'Catches emotional decisions. Selling after a 3% dip? It shows historical recovery data before you panic-sell.',        color: '#9a6e3a' },
  { icon: TrendingUp, title: 'Sector Heatmap',        desc: 'Real-time view of sector momentum. Rotation signals, institutional flow, and sector-level sentiment at a glance.',     color: '#008080' },
  { icon: LineChart,  title: 'Scenario Analysis',     desc: 'Best case, base case, worst case — modelled outcomes for Bull, Normal, and Bear markets with your exact portfolio.',   color: '#9a6e3a' },
  { icon: Zap,        title: '"Explain This To Me"',  desc: 'Every recommendation has a button. Click for a full plain-English breakdown of exactly why the system made that call.', color: '#008080' },
]

export function Features() {
  return (
    <section id="features" className="py-20 relative bg-[#F4E1C1]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />

      <Container>
        <div className="max-w-xl mb-14 animate-fade-up">
          <SectionLabel label="Platform Intelligence" />
          <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
            Features built for the<span className="grad-teal"> real world</span>
          </h2>
          <p className="text-[#0d2b2b]/50 text-base leading-relaxed">
            Every tool you need to invest intelligently — with a second opinion built in, in a language everyone understands.
          </p>
        </div>

        {/* Crown jewels */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(154,110,58,0.2)]" />
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-[#9a6e3a]">♛ Crown Jewels</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(154,110,58,0.2)]" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {crown.map((feat) => {
              const Icon = feat.icon
              return (
                <div key={feat.id}
                  className="relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 hover:-translate-y-1 cursor-default"
                  style={{ background: `${feat.accentColor}07`, borderColor: `${feat.accentColor}18` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${feat.accentColor}35`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${feat.accentColor}12` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${feat.accentColor}18`; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  {/* BG glow corner */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${feat.accentColor}15 0%, transparent 70%)` }} />
                  {/* Halftone bottom-left */}
                  <div className="absolute bottom-0 left-0 w-32 h-32 opacity-25 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, ${feat.accentColor}30 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${feat.accentColor}15`, border: `1px solid ${feat.accentColor}28` }}>
                        <Icon size={18} style={{ color: feat.accentColor }} />
                      </div>
                      <Badge variant={feat.badgeVariant}>
                        {feat.badge === 'Crown Jewel' ? '♛ ' : ''}{feat.badge}
                      </Badge>
                    </div>
                    <h3 className="font-['Syne'] font-bold text-xl text-[#0d2b2b] mb-1.5">{feat.title}</h3>
                    <p className="font-mono text-xs mb-3" style={{ color: feat.accentColor }}>"{feat.tagline}"</p>
                    <p className="text-[#0d2b2b]/50 text-sm leading-relaxed mb-4">{feat.desc}</p>

                    {feat.chips && (
                      <div className="flex flex-wrap gap-1.5">
                        {feat.chips.map((chip) => (
                          <span key={chip} className="px-2.5 py-1 rounded-lg text-xs font-mono" style={{ color: `${feat.accentColor}bb`, background: `${feat.accentColor}0d`, border: `1px solid ${feat.accentColor}20` }}>{chip}</span>
                        ))}
                      </div>
                    )}

                    {feat.demo && (
                      <div className="rounded-xl p-3 font-mono text-xs leading-relaxed" style={{ background: 'rgba(13,43,43,0.05)', borderLeft: `2px solid ${feat.accentColor}50`, color: `${feat.accentColor}99` }}>
                        {feat.demo}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Standard grid */}
        <div className="mt-14">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(0,128,128,0.15)]" />
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-[#0d2b2b]/30">Full Platform</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(0,128,128,0.15)]" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {standard.map((feat) => {
              const Icon = feat.icon
              return (
                <div key={feat.title}
                  className="group p-5 rounded-2xl border border-[rgba(0,128,128,0.1)] bg-[rgba(0,128,128,0.03)] hover:border-[rgba(0,128,128,0.25)] hover:bg-[rgba(0,128,128,0.07)] transition-all duration-300 cursor-default">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110" style={{ background: `${feat.color}10`, border: `1px solid ${feat.color}20` }}>
                    <Icon size={16} style={{ color: feat.color }} />
                  </div>
                  <h4 className="font-['Syne'] font-bold text-sm text-[#0d2b2b] mb-1.5">{feat.title}</h4>
                  <p className="text-[#0d2b2b]/45 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
