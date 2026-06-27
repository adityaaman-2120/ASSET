import { useRef, useEffect, useState } from 'react'

/* ── Intersection hook ── */
function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    // Fallback: always show content after 200ms even if not scrolled to
    const fallback = setTimeout(() => setInView(true), 200)

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); clearTimeout(fallback) }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)

    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [threshold])

  return { ref, inView }
}

/* ── Animated SVG price chart ── */
function RegimeChart({ inView }: { inView: boolean }) {
  const path = 'M0,90 C30,85 40,70 60,65 S90,80 110,60 S140,30 160,28 S190,40 210,35 S240,15 260,10'
  const [dash, setDash] = useState(500)
  useEffect(() => {
    if (!inView) return
    let v = 500
    const t = setInterval(() => { v = Math.max(0, v - 14); setDash(v); if (v === 0) clearInterval(t) }, 16)
    return () => clearInterval(t)
  }, [inView])

  const regimeLabels = [
    { text: 'Bull ↑',      x: '5%',  y: '78%', color: '#008080' },
    { text: 'Volatile ⚡', x: '32%', y: '55%', color: '#9a6e3a' },
    { text: 'Bear ↓',      x: '55%', y: '38%', color: '#c44444' },
    { text: 'Bullish ↑',   x: '77%', y: '18%', color: '#008080' },
  ]

  return (
    <div className="relative select-none">
      <svg viewBox="0 0 280 100" className="w-full" style={{ height: 180 }}>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(0,128,128,0.08)" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        <defs>
          <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#008080" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#008080" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path + ' L260,100 L0,100 Z'} fill="url(#regFill)" />
        <path d={path} stroke="#008080" strokeWidth="2.5" fill="none" strokeLinecap="round"
          strokeDasharray="500" strokeDashoffset={dash} />
        <circle cx="260" cy="10" r="5" fill="#008080"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease 1.5s' }}>
          <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      {regimeLabels.map((r, i) => (
        <span key={r.text}
          className="absolute font-mono text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            left: r.x, top: r.y, color: r.color,
            background: `${r.color}12`, border: `1px solid ${r.color}25`,
            opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(8px)',
            transition: `all 0.5s ease ${0.8 + i * 0.2}s`,
          }}>
          {r.text}
        </span>
      ))}
    </div>
  )
}

/* ── Risk spider ── */
function RiskSpider({ inView }: { inView: boolean }) {
  const cx = 120, cy = 110, r = 80
  const risks = ['Concentration', 'Rate Risk', 'Correlation', 'Liquidity', 'Sector', 'Macro']
  const scores = [0.78, 0.45, 0.62, 0.30, 0.55, 0.40]
  const n = risks.length

  const pts = (scale: number) => risks.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return { x: cx + r * scale * Math.cos(a), y: cy + r * scale * Math.sin(a) }
  })
  const toPath = (points: {x:number;y:number}[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  const outerPts = pts(1)
  const innerPts = inView
    ? risks.map((_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        return { x: cx + r * scores[i] * Math.cos(a), y: cy + r * scores[i] * Math.sin(a) }
      })
    : pts(0.01)

  return (
    <div className="relative select-none">
      <svg viewBox="0 0 240 220" className="w-full" style={{ height: 220 }}>
        {[0.25, 0.5, 0.75, 1].map(sc => (
          <path key={sc} d={toPath(pts(sc))} stroke="rgba(0,128,128,0.1)" strokeWidth="1" fill="none" />
        ))}
        {outerPts.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,128,128,0.08)" strokeWidth="1" />
        ))}
        <path d={toPath(outerPts)} fill="rgba(0,128,128,0.03)" stroke="rgba(0,128,128,0.12)" strokeWidth="1" />
        <path d={toPath(innerPts)} fill="rgba(0,128,128,0.1)" stroke="#008080" strokeWidth="1.5"
          style={{ transition: 'all 1.2s cubic-bezier(.4,0,.2,1) 0.3s' }} />
        {innerPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#008080" fillOpacity="0.8"
            style={{ transition: `all 1s ease ${0.5 + i * 0.1}s` }} />
        ))}
        {outerPts.map((p, i) => {
          const dx = (p.x - cx) * 0.22; const dy = (p.y - cy) * 0.22
          return (
            <text key={i} x={p.x + dx} y={p.y + dy} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="rgba(13,43,43,0.45)" fontFamily="Space Mono, monospace">
              {risks[i]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Typewriter + compiler animation ── */
function NLPDemo({ inView }: { inView: boolean }) {
  const full = '5 lakhs, aggressive, no fossil fuels, max 15% per stock'
  const [typed, setTyped] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const result = [
    { k: 'Capital',    v: '₹5,00,000' },
    { k: 'Risk',       v: 'σ_target = high' },
    { k: 'Exclude',    v: 'w_ONGC = 0, w_COAL = 0' },
    { k: 'Constraint', v: 'w_i ≤ 0.15 ∀ i' },
  ]
  useEffect(() => {
    if (!inView) return
    let i = 0
    const t = setInterval(() => {
      setTyped(full.slice(0, i + 1)); i++
      if (i >= full.length) { clearInterval(t); setTimeout(() => setShowOutput(true), 400) }
    }, 38)
    return () => clearInterval(t)
  }, [inView])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative mb-6">
        <div className="absolute -inset-px rounded-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(0,128,128,0.25), rgba(0,128,128,0.06))' }} />
        <div className="relative rounded-3xl px-8 py-6"
          style={{ background: 'rgba(244,225,193,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,128,128,0.1)' }}>
          <div className="font-mono text-[9px] text-[#0d2b2b]/30 uppercase tracking-widest mb-3">Your instruction →</div>
          <p className="font-['Space_Grotesk'] text-xl text-[#0d2b2b] leading-relaxed font-medium min-h-[2rem]">
            {typed}<span className="animate-blink text-[#008080]">|</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 my-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(0,128,128,0.3)]" />
        <div className="font-mono text-xs text-[#008080] px-5 py-2 rounded-full border border-[rgba(0,128,128,0.25)] bg-[rgba(0,128,128,0.06)]"
          style={{ opacity: showOutput ? 1 : 0.3, transition: 'opacity 0.5s ease' }}>
          Compiled to math →
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(0,128,128,0.3)]" />
      </div>
      <div className="space-y-3">
        {result.map((l, i) => (
          <div key={l.k}
            className="flex items-center gap-6 py-3 border-b border-[rgba(0,128,128,0.1)]"
            style={{ opacity: showOutput ? 1 : 0, transform: showOutput ? 'translateX(0)' : 'translateX(-12px)', transition: `all 0.4s ease ${i * 0.12}s` }}>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#0d2b2b]/35 w-24 flex-shrink-0">{l.k}</span>
            <div className="flex-1 h-px bg-[rgba(0,128,128,0.12)]" />
            <span className="font-mono text-sm text-[#008080] font-bold">{l.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CoreFeatures() {
  const f01 = useInView()
  const f02 = useInView()
  const f03 = useInView()

  /* shared slide-in style */
  const slideIn = (inView: boolean, dir: 'left' | 'right' | 'up' = 'left', delay = 0) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? 'translate(0,0)' : dir === 'left' ? 'translateX(-2rem)' : dir === 'right' ? 'translateX(2rem)' : 'translateY(2rem)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}s`,
  })

  return (
    <div id="features">

      {/* ═══ FEATURE 01 — REGIME DETECTION ═══ */}
      <section className="relative pt-20 pb-16 overflow-hidden bg-[#F4E1C1]" ref={f01.ref}>
        {/* top rule */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        {/* big watermark */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-4 font-['Syne'] font-extrabold text-[22vw] text-[rgba(0,128,128,0.035)] leading-none select-none pointer-events-none">01</div>
        {/* dot texture corner */}
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.15] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,rgba(0,128,128,0.5) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">

            {/* copy */}
            <div style={slideIn(f01.inView, 'left')}>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/30">01 /</span>
                <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#008080]">The Foundation</span>
              </div>
              <h2 className="font-['Syne'] font-extrabold text-[#0d2b2b] leading-[1.0] tracking-[-0.025em] mb-6"
                style={{ fontSize: 'clamp(2.6rem,4.5vw,4rem)' }}>
                We check the<br />market's mood<br />
                <span className="grad-teal">before investing.</span>
              </h2>
              <p className="text-[#0d2b2b]/50 text-lg leading-[1.8] mb-8 max-w-[400px]">
                Is the market a heatwave or a snowstorm? Our system detects the regime first — Bull, Bear, Volatile, or Sideways — then adjusts your portfolio accordingly.
              </p>
              <div className="space-y-0">
                {[
                  { r: 'Bull Market',     a: 'Full aggressive allocation', c: '#008080' },
                  { r: 'Bear Market',     a: 'Capital preservation mode',  c: '#9a6e3a' },
                  { r: 'High Volatility', a: 'Defensive + cash buffer',    c: '#9a6e3a' },
                  { r: 'Sideways',        a: 'Income & dividend focus',    c: '#008080' },
                ].map((s, i) => (
                  <div key={s.r}
                    className="flex items-center gap-4 py-4 border-b border-[rgba(0,128,128,0.08)]"
                    style={{ opacity: f01.inView ? 1 : 0, transform: f01.inView ? 'translateX(0)' : 'translateX(-12px)', transition: `all 0.5s ease ${0.25 + i * 0.1}s` }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.c }} />
                    <span className="font-['Syne'] font-semibold text-sm text-[#0d2b2b] w-36">{s.r}</span>
                    <span className="font-mono text-xs text-[#0d2b2b]/40">{s.a}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 font-mono text-xs text-[#0d2b2b]/30 italic">
                "Most tools give you the same advice no matter what's happening. That's why they fail."
              </p>
            </div>

            {/* chart card */}
            <div style={slideIn(f01.inView, 'right', 0.15)}>
              <div className="relative rounded-3xl px-8 py-10"
                style={{
                  background: 'rgba(232,208,168,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(0,128,128,0.14)',
                  boxShadow: '0 8px 48px rgba(0,128,128,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-[#0d2b2b]/30 mb-1">NSE Composite</div>
                    <div className="font-['Syne'] font-bold text-2xl text-[#0d2b2b]">₹1,84,240</div>
                  </div>
                  <div className="text-right">
                    <div className="font-['Syne'] font-bold text-xl text-[#008080]">+2.4%</div>
                    <div className="font-mono text-[8px] text-[#0d2b2b]/30">Today</div>
                  </div>
                </div>
                <RegimeChart inView={f01.inView} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-[#0d2b2b]/30">Apr 2024</span>
                  <div className="px-3 py-1.5 rounded-full bg-[rgba(0,128,128,0.08)] border border-[rgba(0,128,128,0.18)]">
                    <span className="font-mono text-[9px] text-[#008080] uppercase tracking-widest">● Regime: Bullish</span>
                  </div>
                  <span className="font-mono text-[9px] text-[#0d2b2b]/30">Jun 2026</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ═══ FEATURE 02 — DEVIL'S ADVOCATE ═══ */}
      <section className="relative pt-16 pb-16 overflow-hidden" ref={f02.ref}
        style={{ background: '#ecdcc0' }}>
        {/* rules */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        {/* watermark */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 font-['Syne'] font-extrabold text-[22vw] text-[rgba(0,128,128,0.035)] leading-none select-none pointer-events-none">02</div>
        {/* dot texture */}
        <div className="absolute top-0 left-0 w-80 h-full opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,rgba(0,128,128,0.6) 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* ambient glow */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(0,128,128,0.07) 0%, transparent 70%)' }} />

        <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">

            {/* spider — left */}
            <div style={slideIn(f02.inView, 'left')}>
              <div className="relative rounded-3xl p-8"
                style={{
                  background: 'rgba(244,225,193,0.5)',
                  border: '1px solid rgba(0,128,128,0.12)',
                  boxShadow: '0 4px 32px rgba(0,128,128,0.06)',
                }}>
                <RiskSpider inView={f02.inView} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 justify-center">
                {[
                  { l: 'Concentration', s: 'HIGH', c: '#c44444' },
                  { l: 'Rate Risk',     s: 'MED',  c: '#9a6e3a' },
                  { l: 'Correlation',   s: 'HIGH', c: '#c44444' },
                  { l: 'Liquidity',     s: 'LOW',  c: '#008080' },
                ].map((r, i) => (
                  <span key={r.l}
                    className="font-mono text-[9px] px-3 py-1.5 rounded-full"
                    style={{ color: r.c, background: `${r.c}14`, border: `1px solid ${r.c}28`,
                      opacity: f02.inView ? 1 : 0, transition: `opacity 0.4s ease ${0.8 + i * 0.12}s` }}>
                    {r.l} · {r.s}
                  </span>
                ))}
              </div>
            </div>

            {/* copy — right */}
            <div style={slideIn(f02.inView, 'right', 0.15)}>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/30">02 /</span>
                <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#9a6e3a]">The Safeguard</span>
              </div>
              <h2 className="font-['Syne'] font-extrabold text-[#0d2b2b] leading-[1.0] tracking-[-0.025em] mb-6"
                style={{ fontSize: 'clamp(2.6rem,4.5vw,4rem)' }}>
                Our AI argues<br />with itself<br />
                <span style={{ background: 'linear-gradient(135deg,#9a6e3a,#c49a60)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  to protect you.
                </span>
              </h2>
              <p className="text-[#0d2b2b]/50 text-lg leading-[1.8] mb-10 max-w-[400px]">
                After we build your portfolio, a second AI — the Devil's Advocate — steps in. Its only job is to find what could go wrong. Concentration risk, hidden correlations, rate sensitivity.
              </p>
              <div className="space-y-0">
                {[
                  { title: 'Tech over-concentration', desc: 'TCS + Infosys = 40%. One shock hits both.', icon: '⚠', color: '#9a6e3a' },
                  { title: 'Rate sensitivity',         desc: 'HDFC + ICICI = 32%. Rising rates will squeeze.', icon: '⚠', color: '#9a6e3a' },
                  { title: 'Diversification OK',       desc: '3 sectors · Sharpe 1.8 · No stock > 25%', icon: '✓', color: '#008080' },
                ].map((r, i) => (
                  <div key={r.title}
                    className="flex gap-4 py-4 border-b border-[rgba(0,128,128,0.08)]"
                    style={{ opacity: f02.inView ? 1 : 0, transform: f02.inView ? 'translateX(0)' : 'translateX(12px)', transition: `all 0.5s ease ${0.4 + i * 0.12}s` }}>
                    <span className="text-base flex-shrink-0 mt-0.5" style={{ color: r.color }}>{r.icon}</span>
                    <div>
                      <div className="font-['Syne'] font-semibold text-sm text-[#0d2b2b] mb-0.5">{r.title}</div>
                      <div className="font-mono text-[10px] text-[#0d2b2b]/40">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 font-mono text-xs text-[#0d2b2b]/30 italic">
                "A system honest enough to criticise itself is one you can actually trust."
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* ═══ FEATURE 03 — PLAIN ENGLISH ═══ */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-[#F4E1C1]" ref={f03.ref}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        {/* watermark */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-['Syne'] font-extrabold text-[30vw] text-[rgba(0,128,128,0.03)] leading-none select-none pointer-events-none">03</div>

        <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">
          <div className="text-center mb-14" style={slideIn(f03.inView, 'up')}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/30">03 /</span>
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#008080]">The Interface</span>
            </div>
            <h2 className="font-['Syne'] font-extrabold text-[#0d2b2b] leading-[1.0] tracking-[-0.025em] mb-5"
              style={{ fontSize: 'clamp(2.6rem,4.5vw,4rem)' }}>
              Talk to it like a human.<br />
              <span className="grad-teal">It does the math.</span>
            </h2>
            <p className="text-[#0d2b2b]/50 text-lg leading-[1.78] max-w-xl mx-auto">
              No forms. No dropdowns. No jargon. Just type what you want — we convert your words into the exact mathematical constraints the optimizer needs.
            </p>
          </div>

          <div style={slideIn(f03.inView, 'up', 0.15)}>
            <NLPDemo inView={f03.inView} />
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-3">
            {[
              '"Save for my wedding in 1 year"',
              '"Passive dividend income only"',
              '"No defence stocks, max 20% banking"',
              '"Aggressive, I can lose 30%"',
            ].map((ex, i) => (
              <span key={ex}
                className="font-mono text-xs px-4 py-2.5 rounded-full text-[#0d2b2b]/55 border border-[rgba(0,128,128,0.15)] hover:border-[rgba(0,128,128,0.35)] hover:text-[#008080] transition-all duration-200 cursor-default"
                style={{
                  background: 'rgba(0,128,128,0.04)',
                  opacity: f03.inView ? 1 : 0,
                  transition: `opacity 0.4s ease ${0.5 + i * 0.1}s`,
                }}>
                {ex}
              </span>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
