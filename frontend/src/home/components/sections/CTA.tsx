import { useRef, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface Segment {
  label: string; ticker: string; pct: number; color: string; opacity: number
}

const SEGMENTS: Segment[] = [
  { label: 'TCS',   ticker: 'TCS',   pct: 25, color: '#008080', opacity: 1.0  },
  { label: 'HDFC',  ticker: 'HDFC',  pct: 20, color: '#008080', opacity: 0.70 },
  { label: 'SUN',   ticker: 'SUN',   pct: 15, color: '#9a6e3a', opacity: 1.0  },
  { label: 'INFO',  ticker: 'INFO',  pct: 15, color: '#9a6e3a', opacity: 0.65 },
  { label: 'REL',   ticker: 'REL',   pct: 13, color: '#008080', opacity: 0.45 },
  { label: 'ICICI', ticker: 'ICICI', pct: 12, color: '#9a6e3a', opacity: 0.40 },
]

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s  = polarToXY(cx, cy, r, startDeg)
  const e  = polarToXY(cx, cy, r, endDeg)
  const lg = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${lg} 1 ${e.x} ${e.y}`
}

function DonutChart({ animate }: { animate: boolean }) {
  const cx = 140; const cy = 140; const R = 110; const r = 70
  const gap = 3
  let cursor = 0

  const arcs = SEGMENTS.map(seg => {
    const sweep    = (seg.pct / 100) * 360 - gap
    const startDeg = cursor + gap / 2
    const endDeg   = startDeg + sweep
    const midDeg   = startDeg + sweep / 2
    const labelPos = polarToXY(cx, cy, R + 22, midDeg)
    cursor += (seg.pct / 100) * 360
    const arcLen   = ((seg.pct / 100) * 360 / 360) * Math.PI * (R + r)
    return { ...seg, startDeg, endDeg, midDeg, labelPos, arcLen }
  })

  return (
    <div className="relative" style={{ width: '280px', height: '280px', flexShrink: 0 }}>
      <svg viewBox="0 0 280 280" className="w-full h-full">
        {/* bg ring */}
        <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none"
          stroke="rgba(0,128,128,0.08)" strokeWidth={R - r} />

        {arcs.map((seg, i) => (
          <path key={seg.ticker}
            d={describeArc(cx, cy, (R + r) / 2, seg.startDeg, seg.endDeg)}
            fill="none" stroke={seg.color} strokeWidth={R - r}
            strokeOpacity={seg.opacity} strokeLinecap="butt"
            style={{
              strokeDasharray: seg.arcLen,
              strokeDashoffset: animate ? 0 : seg.arcLen,
              transition: `stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.12}s`,
            }}
          />
        ))}

        <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', fill: '#0d2b2b', opacity: animate ? 1 : 0, transition: 'opacity 0.5s ease 0.8s' }}>
          ₹75K
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'Space Mono, monospace', fontWeight: 400, fontSize: '11px', fill: '#008080', opacity: animate ? 1 : 0, transition: 'opacity 0.5s ease 1s' }}>
          +16.4%
        </text>
      </svg>

      {arcs.map((seg, i) => {
        const labelR = R + 38
        const pos    = polarToXY(cx, cy, labelR, seg.midDeg)
        return (
          <div key={seg.ticker}
            className="absolute font-['Space_Mono'] text-[8px] uppercase tracking-widest"
            style={{
              left: `${(pos.x / 280) * 100}%`,
              top:  `${(pos.y / 280) * 100}%`,
              transform: 'translate(-50%, -50%)',
              color: seg.color,
              opacity: animate ? seg.opacity * 1.4 : 0,
              transition: `opacity 0.4s ease ${0.5 + i * 0.1}s`,
            }}>
            {seg.ticker}
          </div>
        )
      })}
    </div>
  )
}

function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const fallback = setTimeout(() => setInView(true), 200)
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); clearTimeout(fallback) } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [threshold])
  return { ref, inView }
}

export function CTA() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pt-16 pb-24"
      style={{ background: '#F4E1C1' }}
    >
      {/* rules */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />

      {/* subtle grid — very faint */}
      <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />

      {/* ambient glows */}
      <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,128,128,0.07) 0%, transparent 70%)' }} />
      <div className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(154,110,58,0.06) 0%, transparent 70%)' }} />

      {/* dot texture */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,128,128,0.6) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />

      <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">

        {/* section label */}
        <div className="flex items-center gap-4 mb-14">
          <div className="h-px w-12 bg-[rgba(0,128,128,0.2)]" />
          <span className="font-['Space_Mono'] text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/35">
            Start now · Free
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 xl:gap-28 items-center">

          {/* LEFT: headline */}
          <div style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-28px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}>
            <h2 className="font-['Syne'] font-extrabold leading-[1.02] tracking-[-0.025em] mb-8"
              style={{ fontSize: 'clamp(2.4rem,4.5vw,3.8rem)' }}>
              <span className="block text-[#0d2b2b]">Your portfolio,</span>
              <span className="block grad-teal">built by math.</span>
              <span className="block" style={{
                background: 'linear-gradient(135deg, #9a6e3a, #c49a60)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Checked by AI.
              </span>
              <span className="block text-[#0d2b2b]/50">Explained in English.</span>
            </h2>

            <p className="text-[#0d2b2b]/45 text-lg leading-[1.78] max-w-[420px] mb-10">
              No credit card. No sign-in wall. Just answer a few questions about your goals
              and risk appetite — your portfolio is ready in under 2 minutes.
            </p>

            {/* guarantee strip */}
            <div className="flex items-center gap-6 mb-10">
              {[
                { icon: '⚡', text: 'Ready in 2 min' },
                { icon: '🔒', text: 'No card needed' },
                { icon: '✦',  text: 'Free to start'  },
              ].map(g => (
                <div key={g.text} className="flex items-center gap-2">
                  <span className="text-xs">{g.icon}</span>
                  <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.16em] text-[#0d2b2b]/38">
                    {g.text}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="/onboarding"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
                style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 4px 28px rgba(0,128,128,0.3)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = '#006666'
                  el.style.boxShadow = '0 8px 36px rgba(0,128,128,0.4)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = '#008080'
                  el.style.boxShadow = '0 4px 28px rgba(0,128,128,0.3)'
                }}
              >
                Build My Portfolio
                <ArrowRight size={16} />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-sm transition-all duration-200"
                style={{ color: 'rgba(13,43,43,0.55)', border: '1px solid rgba(0,128,128,0.2)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.color = '#008080'
                  el.style.borderColor = 'rgba(0,128,128,0.4)'
                  el.style.background = 'rgba(0,128,128,0.05)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.color = 'rgba(13,43,43,0.55)'
                  el.style.borderColor = 'rgba(0,128,128,0.2)'
                  el.style.background = 'transparent'
                }}
              >
                See how it works →
              </a>
            </div>
          </div>

          {/* RIGHT: donut */}
          <div className="flex flex-col items-center gap-8"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(28px)',
              transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
            }}>
            <div className="flex items-center gap-3 self-start">
              <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.22em] text-[#0d2b2b]/30">
                Sample allocation
              </span>
              <div className="h-px w-12 bg-[rgba(0,128,128,0.15)]" />
            </div>

            {/* donut wrapper card */}
            <div className="relative rounded-3xl p-8"
              style={{
                background: 'rgba(232,208,168,0.5)',
                border: '1px solid rgba(0,128,128,0.12)',
                boxShadow: '0 4px 32px rgba(0,128,128,0.06)',
              }}>
              <DonutChart animate={inView} />
            </div>

            {/* legend */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {SEGMENTS.map((s, i) => (
                <div key={s.ticker} className="flex items-center gap-1.5"
                  style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ease ${0.5 + i * 0.1}s` }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, opacity: s.opacity }} />
                  <span className="font-['Space_Mono'] text-[8px] uppercase tracking-widest text-[#0d2b2b]/45">
                    {s.ticker} {s.pct}%
                  </span>
                </div>
              ))}
            </div>

            <p className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/28 text-center max-w-[240px] leading-relaxed">
              Illustrative · NSE large-cap universe · Markowitz optimal
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
