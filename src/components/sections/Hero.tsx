import { useEffect, useRef, useState } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { Button } from '../ui/Button'
import { PortfolioGlobe } from '../three/PortfolioGlobe'

const WORDS = ['Portfolio.', 'Wealth.', 'Future.']

const METRICS_STRIP = [
  { label: 'AUM Tracked', value: '₹2.4Cr+' },
  { label: 'Win Rate', value: '78%' },
  { label: 'Sharpe Target', value: '1.8×' },
  { label: 'Avg Return', value: '+16.4%' },
  { label: 'Stocks Analysed', value: '500+' },
  { label: 'Regimes Detected', value: '4' },
  { label: 'Risk Vectors', value: '12+' },
  { label: 'Live Signals', value: 'NSE · BSE' },
]

/* ── Candlestick SVG ────────────────────────────────── */
interface Candle {
  x: number
  open: number
  close: number
  high: number
  low: number
  bull: boolean
}

const CANDLES: Candle[] = [
  { x: 20,  open: 130, close: 110, high: 105, low: 140, bull: false },
  { x: 52,  open: 112, close: 95,  high: 88,  low: 118, bull: true  },
  { x: 84,  open: 96,  close: 80,  high: 75,  low: 102, bull: true  },
  { x: 116, open: 82,  close: 98,  high: 72,  low: 104, bull: false },
  { x: 148, open: 96,  close: 78,  high: 70,  low: 100, bull: true  },
  { x: 180, open: 80,  close: 60,  high: 54,  low: 84,  bull: true  },
  { x: 212, open: 62,  close: 44,  high: 38,  low: 68,  bull: true  },
  { x: 244, open: 46,  close: 30,  high: 24,  low: 50,  bull: true  },
  { x: 276, open: 32,  close: 50,  high: 22,  low: 54,  bull: false },
  { x: 308, open: 48,  close: 35,  high: 28,  low: 52,  bull: false },
]

function CandlestickSVG({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 340 160"
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    >
      {/* baseline */}
      <line x1="8" y1="150" x2="332" y2="150" stroke="rgba(0,128,128,0.15)" strokeWidth="1" />

      {CANDLES.map((c, i) => {
        const bodyTop    = Math.min(c.open, c.close)
        const bodyHeight = Math.abs(c.close - c.open)
        const color      = c.bull ? '#008080' : '#9a6e3a'
        const delay      = `${i * 0.12}s`

        return (
          <g key={i} style={{ opacity: visible ? 1 : 0, transition: `opacity 0.4s ease ${delay}` }}>
            {/* wick */}
            <line
              x1={c.x + 10} y1={c.high}
              x2={c.x + 10} y2={c.low}
              stroke={color}
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />
            {/* body */}
            <rect
              x={c.x}
              y={bodyTop}
              width={20}
              height={Math.max(bodyHeight, 3)}
              rx={3}
              fill={c.bull ? color : 'none'}
              stroke={color}
              strokeWidth="1.5"
              fillOpacity={c.bull ? 0.7 : 0}
              style={{
                strokeDasharray: 80,
                strokeDashoffset: visible ? 0 : 80,
                transition: `stroke-dashoffset 0.5s ease ${delay}`,
              }}
            />
          </g>
        )
      })}

      {/* trend line */}
      <polyline
        points="30,120 62,100 94,85 126,90 158,75 190,58 222,42 254,28 286,40 318,38"
        fill="none"
        stroke="rgba(0,128,128,0.35)"
        strokeWidth="1.5"
        strokeDasharray="320"
        style={{
          strokeDashoffset: visible ? 0 : 320,
          transition: 'stroke-dashoffset 1.4s ease 0.3s',
        }}
      />
    </svg>
  )
}

/* ── Floating stat pill ─────────────────────────────── */
interface StatPillProps {
  label: string
  value: string
  accent: string
  className?: string
  animDelay?: string
}

function StatPill({ label, value, accent, className = '', animDelay = '0s' }: StatPillProps) {
  return (
    <div
      className={`animate-float px-3.5 py-2.5 rounded-2xl select-none ${className}`}
      style={{
        animationDelay: animDelay,
        background: 'rgba(244,225,193,0.80)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${accent}30`,
        boxShadow: `0 6px 24px rgba(0,0,0,0.07), 0 0 0 1px ${accent}10`,
      }}
    >
      <div
        className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.2em] mb-0.5"
        style={{ color: `${accent}99` }}
      >
        {label}
      </div>
      <div className="font-['Syne'] font-extrabold text-sm" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}

/* ── Main hero ──────────────────────────────────────── */
export function Hero() {
  const [wordIdx, setWordIdx]     = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const [svgVisible, setSvgVisible]   = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)

  /* word cycling */
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % WORDS.length)
        setWordVisible(true)
      }, 320)
    }, 2400)
    return () => clearInterval(id)
  }, [])

  /* SVG draw-in on mount */
  useEffect(() => {
    const t = setTimeout(() => setSvgVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden pt-20">

      {/* ── Background layer ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* diagonal grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* diagonal skew overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(118deg, transparent 52%, rgba(0,128,128,0.04) 52%)',
          }}
        />
        {/* ambient teal glow top-right */}
        <div
          className="absolute -top-32 right-0 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(0,128,128,0.13) 0%, transparent 68%)',
            filter: 'blur(2px)',
          }}
        />
        {/* halftone bottom-right */}
        <div
          className="absolute bottom-0 right-0 w-[480px] h-[480px] opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(0,128,128,0.25) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* swiss vertical rule */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: '34%',
            background: 'linear-gradient(to bottom, transparent, rgba(0,128,128,0.1), transparent)',
          }}
        />
      </div>

      {/* ── Main content ──────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 xl:px-20 w-full">
          <div className="grid lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_540px] gap-12 xl:gap-20 items-center py-12 lg:py-0">

            {/* ── LEFT: copy ──────────────────────────── */}
            <div>
              {/* eyebrow */}
              <div className="flex items-center gap-2.5 mb-8 animate-fade-up">
                <div
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(0,128,128,0.07)',
                    border: '1px solid rgba(0,128,128,0.2)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008080] ripple" />
                  <span className="font-['Space_Mono'] text-[9px] tracking-[0.2em] uppercase text-[#008080] ml-0.5">
                    Live market analysis
                  </span>
                </div>
              </div>

              {/* headline */}
              <h1
                className="font-['Syne'] font-extrabold leading-[1.02] tracking-[-0.025em] text-[#0d2b2b] mb-6 animate-fade-up delay-100"
                style={{ fontSize: 'clamp(2.8rem, 5.4vw, 4.4rem)' }}
              >
                Your AI quant<br />
                analyst for your{' '}
                <span
                  className="grad-teal inline-block transition-all duration-300"
                  style={{
                    opacity: wordVisible ? 1 : 0,
                    transform: wordVisible ? 'translateY(0)' : 'translateY(10px)',
                  }}
                >
                  {WORDS[wordIdx]}
                </span>
              </h1>

              <p
                className="text-[#0d2b2b]/52 text-lg leading-[1.78] max-w-[430px] mb-10 animate-fade-up delay-200"
              >
                We check the market's mood, build your portfolio mathematically,
                then a second AI attacks it to find what could go wrong —
                all explained in plain English.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap items-center gap-4 mb-12 animate-fade-up delay-300">
                <Button variant="primary" size="lg" iconRight={<ArrowRight size={15} />}>
                  Build My Portfolio
                </Button>
                <button className="flex items-center gap-2.5 text-sm font-medium text-[#0d2b2b]/50 hover:text-[#008080] transition-colors duration-200 group">
                  <span
                    className="w-8 h-8 rounded-full border border-[rgba(0,128,128,0.22)] flex items-center justify-center group-hover:border-[#008080] group-hover:bg-[rgba(0,128,128,0.06)] transition-all"
                  >
                    <span
                      className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-[#008080] ml-0.5"
                    />
                  </span>
                  Watch demo
                </button>
              </div>

              {/* trust numbers */}
              <div
                className="flex items-center gap-5 pt-8 border-t border-[rgba(0,128,128,0.1)] animate-fade-up delay-400"
              >
                {[
                  { val: '2,400+', sub: 'Investors', color: '#008080' },
                  { val: '78%',    sub: 'Signal win rate', color: '#9a6e3a' },
                  { val: '1.8×',   sub: 'Sharpe target', color: '#008080' },
                ].map((t, i) => (
                  <div key={t.sub} className="flex items-center gap-5">
                    {i > 0 && (
                      <div className="w-px h-8 bg-[rgba(0,128,128,0.15)]" />
                    )}
                    <div>
                      <div
                        className="font-['Syne'] font-extrabold text-2xl leading-none"
                        style={{ color: t.color }}
                      >
                        {t.val}
                      </div>
                      <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.18em] text-[#0d2b2b]/35 mt-0.5">
                        {t.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: globe + floating pills ───────── */}
            <div className="relative hidden lg:flex items-center justify-center">
              {/* ambient glow behind globe */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(0,128,128,0.12) 0%, transparent 68%)',
                  filter: 'blur(24px)',
                }}
              />

              {/* candlestick SVG — backdrop */}
              <div
                ref={svgRef}
                className="absolute bottom-0 left-0 right-0 opacity-40 pointer-events-none"
                style={{ height: '160px' }}
              >
                <CandlestickSVG visible={svgVisible} />
              </div>

              {/* globe container */}
              <div
                className="relative w-full"
                style={{ height: '480px' }}
              >
                <PortfolioGlobe className="w-full h-full" />

                {/* floating pills */}
                <StatPill
                  label="Regime"
                  value="Bullish"
                  accent="#008080"
                  animDelay="0s"
                  className="absolute top-6 left-2"
                />
                <StatPill
                  label="Sharpe"
                  value="1.8"
                  accent="#9a6e3a"
                  animDelay="0.8s"
                  className="absolute top-6 right-2"
                />
                <StatPill
                  label="Risk"
                  value="Low-Med"
                  accent="#008080"
                  animDelay="1.5s"
                  className="absolute bottom-48 right-0"
                />
                <StatPill
                  label="Return"
                  value="+16.4%"
                  accent="#9a6e3a"
                  animDelay="2.1s"
                  className="absolute bottom-48 left-0"
                />

                {/* Devil's Advocate pill */}
                <div
                  className="absolute -bottom-3 left-6 animate-float flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                  style={{
                    animationDelay: '0.5s',
                    background: 'rgba(244,225,193,0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(154,110,58,0.28)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
                  }}
                >
                  <TrendingUp size={14} className="text-[#9a6e3a]" />
                  <div>
                    <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.18em] text-[#9a6e3a]">
                      Devil's Advocate
                    </div>
                    <div className="font-['Syne'] font-bold text-sm text-[#0d2b2b]">
                      3 risks reviewed
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Metrics scroll strip ──────────────────────── */}
      <div
        className="relative z-10 w-full overflow-hidden border-t border-[rgba(0,128,128,0.1)] mt-4"
        style={{ background: 'rgba(0,128,128,0.04)' }}
      >
        <div className="flex animate-ticker whitespace-nowrap py-3" style={{ width: 'max-content' }}>
          {[...METRICS_STRIP, ...METRICS_STRIP].map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-8"
            >
              <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.18em] text-[#0d2b2b]/30">
                {m.label}
              </span>
              <span className="font-['Syne'] font-bold text-sm text-[#008080]">
                {m.value}
              </span>
              <span className="text-[#0d2b2b]/15 text-xs">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
