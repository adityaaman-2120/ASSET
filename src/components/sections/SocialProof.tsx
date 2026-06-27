import { useRef, useEffect, useState } from 'react'

/* ── Count-up hook ──────────────────────────────────── */
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

/* ── Sparkline SVG ──────────────────────────────────── */
function Sparkline({ color, animate }: { color: string; animate: boolean }) {
  const points = '2,22 10,18 18,14 26,16 34,10 42,8 50,4 58,6'
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
      <polyline
        points={points}
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
      {/* endpoint dot */}
      <circle
        cx="58" cy="6" r="2.5"
        fill={color}
        style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.4s ease 1.4s' }}
      />
    </svg>
  )
}

/* ── Metric card (extracted to avoid calling hook inside .map) ── */
interface MetricDef {
  value: number; suffix: string; label: string; color: string; isFloat: boolean; borderRight: boolean
}
function MetricCard({ m, inView }: { m: MetricDef; inView: boolean }) {
  const rawCount = useCountUp(m.value, 1600, inView)
  const display = m.isFloat ? (rawCount / 10).toFixed(1) : rawCount.toLocaleString()
  return (
    <div className="py-10 px-8 relative group cursor-default"
      style={{ borderRight: m.borderRight ? '1px solid rgba(244,225,193,0.05)' : 'none' }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `${m.color}07` }} />
      <div className="relative">
        <div className="mb-4"><Sparkline color={m.color} animate={inView} /></div>
        <div className="font-['Syne'] font-extrabold leading-none mb-3 transition-colors duration-300"
          style={{ fontSize: 'clamp(2.8rem, 5vw, 4rem)', color: m.color }}>
          {display}{m.suffix}
        </div>
        <div className="font-['Space_Mono'] text-[9px] text-[#F4E1C1]/28 tracking-wide uppercase max-w-[160px] leading-relaxed">
          {m.label}
        </div>
      </div>
    </div>
  )
}

/* ── Metrics ────────────────────────────────────────── */
const metrics: MetricDef[] = [
  { value: 2400, suffix: '+',   label: 'investors trust the platform',       color: '#008080', isFloat: false, borderRight: true  },
  { value: 78,   suffix: '%',   label: 'signal win rate over 90 days',       color: '#9a6e3a', isFloat: false, borderRight: true  },
  { value: 16,   suffix: '.4%', label: 'average expected annual return',     color: '#008080', isFloat: false, borderRight: true  },
  { value: 18,   suffix: '×',   label: 'Sharpe ratio — vs 0.9 market avg',  color: '#9a6e3a', isFloat: true,  borderRight: false },
]

const TECH_STACK = 'Yahoo Finance · NSE India · XGBoost · PyPortfolioOpt · Gemini Pro'

/* ── Component ──────────────────────────────────────── */
export function SocialProof() {
  const ref    = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.25 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className="py-28 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #112f2f 0%, #0d2b2b 18%, #0d2b2b 82%, #112f2f 100%)' }}
    >
      {/* ── Top accent line + fade ───────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,128,128,0.35), transparent)' }} />
      <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(244,225,193,0.06) 0%, transparent 100%)' }} />
      {/* ── Bottom accent line + fade ────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,128,128,0.35), transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(244,225,193,0.06) 0%, transparent 100%)' }} />

      {/* ── Background texture ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.065]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(244,225,193,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,128,128,0.1) 0%, transparent 70%)',
          }}
        />
        {/* orbiting ring */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[960px] h-[960px] rounded-full border border-[rgba(0,128,128,0.07)] animate-spin-slow pointer-events-none"
        />
        {/* diagonal slash */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(118deg, transparent 60%, rgba(0,128,128,0.03) 60%)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">

        {/* ── Section label ────────────────────────── */}
        <div className="flex items-center gap-4 mb-16">
          <div className="h-px w-12 bg-[rgba(244,225,193,0.12)]" />
          <span className="font-['Space_Mono'] text-[9px] tracking-[0.28em] uppercase text-[#F4E1C1]/28">
            By the numbers
          </span>
        </div>

        {/* ── Metric grid — editorial, open ────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 mb-24">
          {metrics.map((m) => (
            <MetricCard key={m.label} m={m} inView={inView} />
          ))}
        </div>

        {/* ── Editorial quote ───────────────────────── */}
        <div className="relative mb-16">
          {/* giant open-quote mark */}
          <div
            className="absolute -left-4 -top-8 font-['Syne'] leading-none text-[rgba(0,128,128,0.14)] select-none pointer-events-none"
            style={{ fontSize: '10rem' }}
          >
            "
          </div>

          <div className="pl-16 lg:pl-24">
            <p
              className="font-['Syne'] font-bold text-[#F4E1C1] leading-[1.18] mb-8 max-w-4xl"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 3rem)' }}
            >
              We didn't build another stock screener. We built a quant analyst that understands
              your financial life and speaks your language.
            </p>

            <div className="flex items-center gap-4">
              <div className="h-px w-10 bg-[rgba(0,128,128,0.45)]" />
              <span className="font-['Space_Mono'] text-[9px] tracking-[0.22em] uppercase text-[#008080]/65">
                ASSETS · 2026
              </span>
            </div>
          </div>
        </div>

        {/* ── Tech stack / "as seen in" row ────────── */}
        <div className="swiss-line mb-8" />
        <div className="flex items-center gap-4">
          <span className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.22em] text-[#F4E1C1]/18 flex-shrink-0">
            Built with
          </span>
          <p
            className="font-['Space_Mono'] text-[9px] tracking-[0.12em] text-[#F4E1C1]/18"
            style={{ letterSpacing: '0.06em' }}
          >
            {TECH_STACK}
          </p>
        </div>
      </div>
    </section>
  )
}
