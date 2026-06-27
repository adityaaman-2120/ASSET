import { useRef, useEffect, useState } from 'react'

function useCountUp(target: number, duration = 1800, inView = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, inView])
  return val
}

function Sparkline({ color, animate }: { color: string; animate: boolean }) {
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
      <polyline
        points="2,22 10,18 18,14 26,16 34,10 42,8 50,4 58,6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          strokeDasharray: 120,
          strokeDashoffset: animate ? 0 : 120,
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s',
        }}
      />
      <circle cx="58" cy="6" r="2.5" fill={color}
        style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.4s ease 1.4s' }} />
    </svg>
  )
}

interface MetricDef {
  value: number; suffix: string; label: string; color: string; isFloat: boolean; borderRight: boolean
}
function MetricCard({ m, inView }: { m: MetricDef; inView: boolean }) {
  const rawCount = useCountUp(m.value, 1600, inView)
  const display  = m.isFloat ? (rawCount / 10).toFixed(1) : rawCount.toLocaleString()
  return (
    <div className="py-10 px-8 relative group cursor-default"
      style={{ borderRight: m.borderRight ? '1px solid rgba(0,128,128,0.1)' : 'none' }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `${m.color}06` }} />
      <div className="relative">
        <div className="mb-4"><Sparkline color={m.color} animate={inView} /></div>
        <div className="font-['Syne'] font-extrabold leading-none mb-3"
          style={{ fontSize: 'clamp(2.4rem,4.5vw,3.6rem)', color: m.color }}>
          {display}{m.suffix}
        </div>
        <div className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/35 tracking-wide uppercase max-w-[160px] leading-relaxed">
          {m.label}
        </div>
      </div>
    </div>
  )
}

const metrics: MetricDef[] = [
  { value: 2400, suffix: '+',   label: 'investors trust the platform',      color: '#008080', isFloat: false, borderRight: true  },
  { value: 78,   suffix: '%',   label: 'signal win rate over 90 days',      color: '#9a6e3a', isFloat: false, borderRight: true  },
  { value: 16,   suffix: '.4%', label: 'average expected annual return',    color: '#008080', isFloat: false, borderRight: true  },
  { value: 18,   suffix: '×',   label: 'Sharpe ratio — vs 0.9 market avg', color: '#9a6e3a', isFloat: true,  borderRight: false },
]

const TECH_STACK = 'Yahoo Finance · NSE India · XGBoost · PyPortfolioOpt · Gemini Pro'

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const fallback = setTimeout(() => setInView(true), 200)
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); clearTimeout(fallback) } },
      { threshold: 0.05 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [])

  return (
    <section
      ref={ref}
      className="pt-16 pb-20 relative overflow-hidden"
      style={{ background: '#ecdcc0' }}
    >
      {/* rules */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />

      {/* dot texture */}
      <div className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,128,128,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

      {/* ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,128,128,0.06) 0%, transparent 70%)' }} />

      {/* orbiting ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-[rgba(0,128,128,0.05)] animate-spin-slow pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">

        {/* section label */}
        <div className="flex items-center gap-4 mb-14">
          <div className="h-px w-12 bg-[rgba(0,128,128,0.2)]" />
          <span className="font-['Space_Mono'] text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/35">
            By the numbers
          </span>
        </div>

        {/* metric grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 mb-20 rounded-3xl overflow-hidden"
          style={{ background: 'rgba(244,225,193,0.5)', border: '1px solid rgba(0,128,128,0.1)', boxShadow: '0 4px 32px rgba(0,128,128,0.05)' }}>
          {metrics.map((m) => (
            <MetricCard key={m.label} m={m} inView={inView} />
          ))}
        </div>

        {/* editorial quote */}
        <div className="relative mb-14">
          <div className="absolute -left-4 -top-6 font-['Syne'] leading-none text-[rgba(0,128,128,0.1)] select-none pointer-events-none"
            style={{ fontSize: '8rem' }}>
            "
          </div>
          <div className="pl-14 lg:pl-20">
            <p className="font-['Syne'] font-bold text-[#0d2b2b] leading-[1.2] mb-8 max-w-4xl"
              style={{ fontSize: 'clamp(1.5rem,3.5vw,2.6rem)' }}>
              We didn't build another stock screener. We built a quant analyst that understands
              your financial life and speaks your language.
            </p>
            <div className="flex items-center gap-4">
              <div className="h-px w-10 bg-[rgba(0,128,128,0.3)]" />
              <span className="font-['Space_Mono'] text-[9px] tracking-[0.22em] uppercase text-[#008080]/60">
                ASSETS · 2026
              </span>
            </div>
          </div>
        </div>

        {/* tech stack row */}
        <div className="swiss-line mb-6" />
        <div className="flex items-center gap-4">
          <span className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.22em] text-[#0d2b2b]/30 flex-shrink-0">
            Built with
          </span>
          <p className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/25" style={{ letterSpacing: '0.06em' }}>
            {TECH_STACK}
          </p>
        </div>

      </div>
    </section>
  )
}
