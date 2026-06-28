import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, TrendingUp, Brain, Shield, MessageSquare,
  Target, Zap, BarChart3, FlaskConical, LineChart, Layers,
  Compass, UserCircle, Database, Cpu, PieChart, LayoutDashboard,
  CheckCircle,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

// ─── Animated word cycling ────────────────────────────────────────────────────
const WORDS = ['Portfolio.', 'Wealth.', 'Future.']

// ─── Metrics ticker ───────────────────────────────────────────────────────────
const METRICS_STRIP = [
  { label: 'AUM Tracked',      value: '₹2.4Cr+' },
  { label: 'Win Rate',         value: '78%' },
  { label: 'Sharpe Target',    value: '1.8×' },
  { label: 'Avg Return',       value: '+16.4%' },
  { label: 'Stocks Analysed',  value: '500+' },
  { label: 'Regimes Detected', value: '4' },
  { label: 'Risk Vectors',     value: '12+' },
  { label: 'Live Signals',     value: 'NSE · BSE' },
]

// ─── Candlestick SVG ──────────────────────────────────────────────────────────
const CANDLES = [
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

function CandlestickSVG({ visible }) {
  return (
    <svg viewBox="0 0 340 160" className="w-full h-full" style={{ overflow: 'visible' }}>
      <line x1="8" y1="150" x2="332" y2="150" stroke="rgba(0,128,128,0.15)" strokeWidth="1" />
      {CANDLES.map((c, i) => {
        const bodyTop    = Math.min(c.open, c.close)
        const bodyHeight = Math.abs(c.close - c.open)
        const color      = c.bull ? '#008080' : '#9a6e3a'
        const delay      = `${i * 0.12}s`
        return (
          <g key={i} style={{ opacity: visible ? 1 : 0, transition: `opacity 0.4s ease ${delay}` }}>
            <line x1={c.x + 10} y1={c.high} x2={c.x + 10} y2={c.low} stroke={color} strokeWidth="1.2" strokeOpacity="0.55" />
            <rect
              x={c.x} y={bodyTop} width={20} height={Math.max(bodyHeight, 3)} rx={3}
              fill={c.bull ? color : 'none'} stroke={color} strokeWidth="1.5" fillOpacity={c.bull ? 0.7 : 0}
              style={{ strokeDasharray: 80, strokeDashoffset: visible ? 0 : 80, transition: `stroke-dashoffset 0.5s ease ${delay}` }}
            />
          </g>
        )
      })}
      <polyline
        points="30,120 62,100 94,85 126,90 158,75 190,58 222,42 254,28 286,40 318,38"
        fill="none" stroke="rgba(0,128,128,0.35)" strokeWidth="1.5" strokeDasharray="320"
        style={{ strokeDashoffset: visible ? 0 : 320, transition: 'stroke-dashoffset 1.4s ease 0.3s' }}
      />
    </svg>
  )
}

// ─── Floating stat pill ───────────────────────────────────────────────────────
function StatPill({ label, value, accent, className = '', animDelay = '0s' }) {
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
      <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.2em] mb-0.5" style={{ color: `${accent}99` }}>{label}</div>
      <div className="font-['Syne'] font-extrabold text-sm" style={{ color: accent }}>{value}</div>
    </div>
  )
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1800, inView = false) {
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

// ─── InView hook ─────────────────────────────────────────────────────────────
function useInView(threshold = 0.05) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const fallback = setTimeout(() => setInView(true), 400)
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); clearTimeout(fallback) } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [threshold])
  return { ref, inView }
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ color, animate }) {
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
      <polyline
        points="2,22 10,18 18,14 26,16 34,10 42,8 50,4 58,6"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        style={{ strokeDasharray: 120, strokeDashoffset: animate ? 0 : 120, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s' }}
      />
      <circle cx="58" cy="6" r="2.5" fill={color} style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.4s ease 1.4s' }} />
    </svg>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ m, inView }) {
  const rawCount = useCountUp(m.value, 1600, inView)
  const display  = m.isFloat ? (rawCount / 10).toFixed(1) : rawCount.toLocaleString()
  return (
    <div
      className="py-10 px-8 relative group cursor-default"
      style={{ borderRight: m.borderRight ? '1px solid rgba(0,128,128,0.1)' : 'none' }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ background: `${m.color}06` }} />
      <div className="relative">
        <div className="mb-4"><Sparkline color={m.color} animate={inView} /></div>
        <div className="font-['Syne'] font-extrabold leading-none mb-3" style={{ fontSize: 'clamp(2.4rem,4.5vw,3.6rem)', color: m.color }}>
          {display}{m.suffix}
        </div>
        <div className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/35 tracking-wide uppercase max-w-[160px] leading-relaxed">{m.label}</div>
      </div>
    </div>
  )
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
const SEGMENTS = [
  { label: 'TCS',   ticker: 'TCS',   pct: 25, color: '#008080', opacity: 1.0  },
  { label: 'HDFC',  ticker: 'HDFC',  pct: 20, color: '#008080', opacity: 0.70 },
  { label: 'SUN',   ticker: 'SUN',   pct: 15, color: '#9a6e3a', opacity: 1.0  },
  { label: 'INFO',  ticker: 'INFO',  pct: 15, color: '#9a6e3a', opacity: 0.65 },
  { label: 'REL',   ticker: 'REL',   pct: 13, color: '#008080', opacity: 0.45 },
  { label: 'ICICI', ticker: 'ICICI', pct: 12, color: '#9a6e3a', opacity: 0.40 },
]

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s  = polarToXY(cx, cy, r, startDeg)
  const e  = polarToXY(cx, cy, r, endDeg)
  const lg = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${lg} 1 ${e.x} ${e.y}`
}

function DonutChart({ animate }) {
  const cx = 140; const cy = 140; const R = 110; const r = 70; const gap = 3
  let cursor = 0
  const arcs = SEGMENTS.map(seg => {
    const sweep    = (seg.pct / 100) * 360 - gap
    const startDeg = cursor + gap / 2
    const endDeg   = startDeg + sweep
    const midDeg   = startDeg + sweep / 2
    const arcLen   = ((seg.pct / 100) * 360 / 360) * Math.PI * (R + r)
    cursor += (seg.pct / 100) * 360
    return { ...seg, startDeg, endDeg, midDeg, arcLen }
  })

  return (
    <div className="relative" style={{ width: '280px', height: '280px', flexShrink: 0 }}>
      <svg viewBox="0 0 280 280" className="w-full h-full">
        <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="rgba(0,128,128,0.08)" strokeWidth={R - r} />
        {arcs.map((seg, i) => (
          <path key={seg.ticker}
            d={describeArc(cx, cy, (R + r) / 2, seg.startDeg, seg.endDeg)}
            fill="none" stroke={seg.color} strokeWidth={R - r} strokeOpacity={seg.opacity} strokeLinecap="butt"
            style={{ strokeDasharray: seg.arcLen, strokeDashoffset: animate ? 0 : seg.arcLen, transition: `stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.12}s` }}
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
          <div key={seg.ticker} className="absolute font-['Space_Mono'] text-[8px] uppercase tracking-widest"
            style={{ left: `${(pos.x / 280) * 100}%`, top: `${(pos.y / 280) * 100}%`, transform: 'translate(-50%, -50%)', color: seg.color, opacity: animate ? seg.opacity * 1.4 : 0, transition: `opacity 0.4s ease ${0.5 + i * 0.1}s` }}>
            {seg.ticker}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  const [wordIdx, setWordIdx]       = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const [svgVisible, setSvgVisible]   = useState(false)

  const { ref: statsRef, inView: statsInView }   = useInView()
  const { ref: ctaRef,   inView: ctaInView }     = useInView()

  // word cycling
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setWordVisible(true) }, 320)
    }, 2400)
    return () => clearInterval(id)
  }, [])

  // SVG draw-in
  useEffect(() => {
    const t = setTimeout(() => setSvgVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  const metrics = [
    { value: 2400, suffix: '+',   label: 'investors trust the platform',      color: '#008080', isFloat: false, borderRight: true  },
    { value: 78,   suffix: '%',   label: 'signal win rate over 90 days',      color: '#9a6e3a', isFloat: false, borderRight: true  },
    { value: 16,   suffix: '.4%', label: 'average expected annual return',    color: '#008080', isFloat: false, borderRight: true  },
    { value: 18,   suffix: '×',   label: 'Sharpe ratio — vs 0.9 market avg', color: '#9a6e3a', isFloat: true,  borderRight: false },
  ]

  const phases = [
    { num: '00', phase: 'Phase 0', icon: UserCircle,    color: '#008080', title: 'Investor Profiling',      desc: 'Structured onboarding — capital, risk tolerance, time horizon, sectors, and a free-text goal you type in plain English.',         details: ['Capital & Risk', 'Time Horizon', 'Sector Interest', 'Investment Style', 'NLP Goal Input'] },
    { num: '01', phase: 'Phase 1', icon: Database,      color: '#9a6e3a', title: 'Market Data Pipeline',    desc: 'Real-time OHLCV data, P/E ratios, sector classification, and news sentiment — pulled from Yahoo Finance and NSE India APIs.',    details: ['Live OHLCV data', '52-week highs/lows', 'Sector heatmaps', 'News sentiment', 'Volume analysis'] },
    { num: '02', phase: 'Phase 2', icon: Cpu,           color: '#008080', title: 'ML Prediction Engine',   desc: 'XGBoost model trained on RSI, MACD, volume spikes, and sector momentum. Outputs Buy/Hold/Sell signals with confidence % and plain-English reason.', details: ['RSI + MACD signals', 'Volume confirmation', 'Sector momentum', 'Confidence scoring', 'Plain-English reason'] },
    { num: '03', phase: 'Phase 3', icon: PieChart,      color: '#9a6e3a', title: 'Portfolio Optimization', desc: "Markowitz efficient frontier finds the mathematically optimal allocation. Devil's Advocate AI then attacks the result to catch hidden risks.", details: ['Efficient frontier', 'Sharpe maximization', 'Risk-adjusted return', "Devil's Advocate review", 'Scenario analysis'] },
    { num: '04', phase: 'Phase 4', icon: LayoutDashboard, color: '#008080', title: 'Live Dashboard',       desc: 'Your portfolio, live. AI insight feed in plain English, rebalance suggestions, goal tracking, and the "What If" simulator — all in one place.', details: ['Live portfolio value', 'AI insight feed', 'Rebalance alerts', 'Goal progress', '"What If" simulator'] },
  ]

  const crown = [
    { id: 'regime', icon: Compass,        badge: '♛ Crown Jewel', accentColor: '#9a6e3a', title: 'Regime Detection',          tagline: "Check the market's mood before investing.",         desc: "Before building anything, the system identifies what kind of market you're in — Bull, Bear, High-Volatility, or Sideways. In calm markets we go aggressive; in stormy ones we go defensive.",      chips: ['Bull market', 'Bear market', 'High volatility', 'Sideways'] },
    { id: 'devil', icon: Shield,          badge: '♛ Crown Jewel', accentColor: '#008080', title: "Devil's Advocate Agent",    tagline: 'Our AI argues with itself to protect you.',        desc: "After the system builds a portfolio, a second AI steps in to attack it. It probes concentration risk, hidden correlations, and macro vulnerabilities — then reports before you invest.",        chips: ['Concentration risk', 'Correlation traps', 'Macro exposure', 'Sector overlap'] },
    { id: 'nlp',   icon: MessageSquare,   badge: 'Unique',         accentColor: '#008080', title: 'NL Constraint Compiler',   tagline: 'Talk to it like a human; it does the math.',       desc: 'Type "invest 5 lakhs, aggressive, no fossil fuels, max 15% in one stock" and the system converts your sentence into exact mathematical optimizer constraints.',                                   demo: '"No fossil fuels, max 15% per stock, aggressive" → w_ONGC=0, w_i≤0.15, σ_target=high' },
  ]

  const standard = [
    { icon: Brain,        title: 'ML Prediction Engine',  desc: 'XGBoost produces Buy/Hold/Sell signals with confidence scores and a plain-English reason for every call.',                                color: '#008080' },
    { icon: BarChart3,    title: 'Markowitz Optimizer',   desc: 'Mathematically perfect capital allocation across your shortlisted stocks to maximise return for your risk level.',                        color: '#9a6e3a' },
    { icon: Layers,       title: 'Technical Indicators',  desc: 'RSI, MACD, Bollinger Bands, Moving Averages — computed automatically and translated into human-readable insights.',                       color: '#008080' },
    { icon: FlaskConical, title: '"What If" Simulator',   desc: '"What if I add ₹10K to Reliance?" Instantly models how it shifts return, risk score, and Sharpe Ratio.',                                 color: '#9a6e3a' },
    { icon: Target,       title: 'Goal Tracker',          desc: 'Set a goal — "₹90,000 in 12 months" — and the platform tracks progress, projects outcomes, and alerts on drift.',                        color: '#008080' },
    { icon: Zap,          title: '"Explain This To Me"',  desc: 'Every recommendation has a button. Click for a full plain-English breakdown of exactly why the system made that call.',                  color: '#9a6e3a' },
    { icon: TrendingUp,   title: 'Sector Heatmap',        desc: 'Real-time view of sector momentum. Rotation signals, institutional flow, and sector-level sentiment at a glance.',                       color: '#008080' },
    { icon: LineChart,    title: 'Scenario Analysis',     desc: 'Best case, base case, worst case — modelled outcomes for Bull, Normal, and Bear markets with your exact portfolio.',                     color: '#9a6e3a' },
    { icon: Shield,       title: 'Historical Stress Test',desc: 'Simulate your portfolio through 2008 Financial Crisis, COVID-19 crash, and the 2022 correction — instantly.',                            color: '#008080' },
  ]

  return (
    <div style={{ background: '#F4E1C1', color: '#0d2b2b' }}>

      {/* ═══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col overflow-hidden pt-6">

        {/* Background */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(118deg, transparent 52%, rgba(0,128,128,0.04) 52%)' }} />
          <div className="absolute -top-32 right-0 w-[640px] h-[640px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(0,128,128,0.13) 0%, transparent 68%)', filter: 'blur(2px)' }} />
          <div className="absolute bottom-0 right-0 w-[480px] h-[480px] opacity-25"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(0,128,128,0.25) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 bottom-0 w-px" style={{ left: '34%', background: 'linear-gradient(to bottom, transparent, rgba(0,128,128,0.1), transparent)' }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 xl:px-20 w-full">
            <div className="grid lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_540px] gap-12 xl:gap-20 items-center py-12 lg:py-0">

              {/* LEFT: copy */}
              <div>
                {/* Eyebrow */}
                <div className="flex items-center gap-2.5 mb-8 animate-fade-up">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                    style={{ background: 'rgba(0,128,128,0.07)', border: '1px solid rgba(0,128,128,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008080] ripple" />
                    <span className="font-['Space_Mono'] text-[9px] tracking-[0.2em] uppercase text-[#008080] ml-0.5">Live market analysis</span>
                  </div>
                </div>

                {/* Headline */}
                <h1
                  className="font-['Syne'] font-extrabold leading-[1.02] tracking-[-0.025em] text-[#0d2b2b] mb-6 animate-fade-up delay-100"
                  style={{ fontSize: 'clamp(2.8rem, 5.4vw, 4.4rem)' }}
                >
                  Your AI quant<br />
                  analyst for your{' '}
                  <span className="grad-teal inline-block transition-all duration-300"
                    style={{ opacity: wordVisible ? 1 : 0, transform: wordVisible ? 'translateY(0)' : 'translateY(10px)' }}>
                    {WORDS[wordIdx]}
                  </span>
                </h1>

                <p className="text-[#0d2b2b]/52 text-lg leading-[1.78] max-w-[430px] mb-10 animate-fade-up delay-200">
                  We check the market's mood, build your portfolio mathematically,
                  then a second AI attacks it to find what could go wrong —
                  all explained in plain English.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-4 mb-12 animate-fade-up delay-300">
                  <button
                    type="button"
                    onClick={() => navigate(isAuthenticated ? '/analyze' : '/auth/register')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm text-[#F4E1C1] transition-all duration-200 active:scale-[0.98]"
                    style={{ background: '#008080', boxShadow: '0 0 20px rgba(0,128,128,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#006666'; e.currentTarget.style.boxShadow = '0 0 32px rgba(0,128,128,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#008080'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,128,128,0.3)' }}
                  >
                    Build My Portfolio
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(isAuthenticated ? '/questionnaire' : '/auth/register')}
                    className="flex items-center gap-2.5 text-sm font-medium text-[#0d2b2b]/50 hover:text-[#008080] transition-colors duration-200 group"
                  >
                    <span className="w-8 h-8 rounded-full border border-[rgba(0,128,128,0.22)] flex items-center justify-center group-hover:border-[#008080] group-hover:bg-[rgba(0,128,128,0.06)] transition-all">
                      <span className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-[#008080] ml-0.5" />
                    </span>
                    Try Questionnaire
                  </button>
                </div>

                {/* Trust numbers */}
                <div className="flex items-center gap-5 pt-8 border-t border-[rgba(0,128,128,0.1)] animate-fade-up delay-400">
                  {[
                    { val: '2,400+', sub: 'Investors',       color: '#008080' },
                    { val: '78%',    sub: 'Signal win rate', color: '#9a6e3a' },
                    { val: '1.8×',   sub: 'Sharpe target',   color: '#008080' },
                  ].map((t, i) => (
                    <div key={t.sub} className="flex items-center gap-5">
                      {i > 0 && <div className="w-px h-8 bg-[rgba(0,128,128,0.15)]" />}
                      <div>
                        <div className="font-['Syne'] font-extrabold text-2xl leading-none" style={{ color: t.color }}>{t.val}</div>
                        <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.18em] text-[#0d2b2b]/35 mt-0.5">{t.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: chart visualization */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(ellipse, rgba(0,128,128,0.12) 0%, transparent 68%)', filter: 'blur(24px)' }} />

                {/* Candlestick backdrop */}
                <div className="absolute bottom-0 left-0 right-0 opacity-40 pointer-events-none" style={{ height: '160px' }}>
                  <CandlestickSVG visible={svgVisible} />
                </div>

                {/* Visualization panel */}
                <div className="relative w-full" style={{ height: '480px' }}>
                  {/* Main card */}
                  <div className="absolute inset-8 rounded-3xl border border-[rgba(0,128,128,0.15)] overflow-hidden"
                    style={{ background: 'rgba(244,225,193,0.6)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,80,80,0.12)' }}>
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.2em] text-[#0d2b2b]/40">Portfolio Value</div>
                          <div className="font-['Syne'] font-extrabold text-2xl text-[#0d2b2b]">₹2,42,800</div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,128,128,0.1)', border: '1px solid rgba(0,128,128,0.2)' }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#008080]" />
                          <span className="font-['Space_Mono'] text-[9px] text-[#008080]">+16.4%</span>
                        </div>
                      </div>
                      {/* Mini bar chart */}
                      <div className="flex-1 flex items-end gap-2 pt-4">
                        {[
                          { ticker: 'TCS',    pct: 25, color: '#008080' },
                          { ticker: 'HDFC',   pct: 20, color: '#008080', op: 0.7 },
                          { ticker: 'SUN',    pct: 15, color: '#9a6e3a' },
                          { ticker: 'INFO',   pct: 15, color: '#9a6e3a', op: 0.7 },
                          { ticker: 'REL',    pct: 13, color: '#008080', op: 0.5 },
                          { ticker: 'ICICI',  pct: 12, color: '#9a6e3a', op: 0.4 },
                        ].map((s, i) => (
                          <div key={s.ticker} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-t-lg transition-all duration-700"
                              style={{ height: `${s.pct * 3.5}px`, background: s.color, opacity: s.op || 1, animationDelay: `${i * 0.1}s` }} />
                            <span className="font-['Space_Mono'] text-[7px] uppercase tracking-wider text-[#0d2b2b]/40">{s.ticker}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-[rgba(0,128,128,0.1)] flex items-center justify-between">
                        <span className="font-['Space_Mono'] text-[8px] uppercase tracking-wider text-[#0d2b2b]/30">Markowitz Optimal</span>
                        <span className="font-['Space_Mono'] text-[8px] text-[#008080]">Sharpe 1.8×</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating pills */}
                  <StatPill label="Regime"       value="Bullish"  accent="#008080" animDelay="0s"   className="absolute top-2 left-0" />
                  <StatPill label="Sharpe"       value="1.8"      accent="#9a6e3a" animDelay="0.8s" className="absolute top-2 right-0" />
                  <StatPill label="Risk"         value="Low-Med"  accent="#008080" animDelay="1.5s" className="absolute bottom-40 right-0" />
                  <StatPill label="Return"       value="+16.4%"   accent="#9a6e3a" animDelay="2.1s" className="absolute bottom-40 left-0" />

                  {/* Devil's Advocate pill */}
                  <div className="absolute -bottom-3 left-6 animate-float flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                    style={{ animationDelay: '0.5s', background: 'rgba(244,225,193,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(154,110,58,0.28)', boxShadow: '0 8px 28px rgba(0,0,0,0.08)' }}>
                    <TrendingUp size={14} className="text-[#9a6e3a]" />
                    <div>
                      <div className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.18em] text-[#9a6e3a]">Devil's Advocate</div>
                      <div className="font-['Syne'] font-bold text-sm text-[#0d2b2b]">3 risks reviewed</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Metrics ticker strip */}
        <div className="relative z-10 w-full overflow-hidden border-t border-[rgba(0,128,128,0.1)] mt-4"
          style={{ background: 'rgba(0,128,128,0.04)' }}>
          <div className="flex animate-ticker whitespace-nowrap py-3" style={{ width: 'max-content' }}>
            {[...METRICS_STRIP, ...METRICS_STRIP].map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-8">
                <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.18em] text-[#0d2b2b]/30">{m.label}</span>
                <span className="font-['Syne'] font-bold text-sm text-[#008080]">{m.value}</span>
                <span className="text-[#0d2b2b]/15 text-xs">·</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS / SOCIAL PROOF ════════════════════════════════════════════ */}
      <section ref={statsRef} className="pt-16 pb-20 relative overflow-hidden" style={{ background: '#ecdcc0' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        <div className="absolute inset-0 opacity-[0.09] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,128,128,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(0,128,128,0.06) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-[rgba(0,128,128,0.05)] animate-spin-slow pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">
          <div className="flex items-center gap-4 mb-14">
            <div className="h-px w-12 bg-[rgba(0,128,128,0.2)]" />
            <span className="font-['Space_Mono'] text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/35">By the numbers</span>
          </div>

          {/* Metric cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 mb-20 rounded-3xl overflow-hidden"
            style={{ background: 'rgba(244,225,193,0.5)', border: '1px solid rgba(0,128,128,0.1)', boxShadow: '0 4px 32px rgba(0,128,128,0.05)' }}>
            {metrics.map((m) => <MetricCard key={m.label} m={m} inView={statsInView} />)}
          </div>

          {/* Editorial quote */}
          <div className="relative mb-14">
            <div className="absolute -left-4 -top-6 font-['Syne'] leading-none text-[rgba(0,128,128,0.1)] select-none pointer-events-none" style={{ fontSize: '8rem' }}>"</div>
            <div className="pl-14 lg:pl-20">
              <p className="font-['Syne'] font-bold text-[#0d2b2b] leading-[1.2] mb-8 max-w-4xl" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.6rem)' }}>
                We didn't build another stock screener. We built a quant analyst that understands your financial life and speaks your language.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-[rgba(0,128,128,0.3)]" />
                <span className="font-['Space_Mono'] text-[9px] tracking-[0.22em] uppercase text-[#008080]/60">ASSETS · 2026</span>
              </div>
            </div>
          </div>

          <div className="swiss-line mb-6" />
          <div className="flex items-center gap-4">
            <span className="font-['Space_Mono'] text-[8px] uppercase tracking-[0.22em] text-[#0d2b2b]/30 flex-shrink-0">Built with</span>
            <p className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/25" style={{ letterSpacing: '0.06em' }}>
              Yahoo Finance · NSE India · XGBoost · PyPortfolioOpt · Groq Llama · SHAP
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 relative" style={{ background: '#F4E1C1' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />

        <div className="max-w-7xl mx-auto px-6 xl:px-20">
          <div className="max-w-xl mb-14 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#008080]" />
              <span className="font-['Space_Mono'] text-[10px] tracking-[0.22em] uppercase text-[#008080]">Platform Intelligence</span>
            </div>
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
              <span className="font-['Space_Mono'] text-[9px] tracking-[0.25em] uppercase text-[#9a6e3a]">♛ Crown Jewels</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(154,110,58,0.2)]" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {crown.map((feat) => {
                const Icon = feat.icon
                return (
                  <div key={feat.id}
                    className="relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 hover:-translate-y-1 cursor-default"
                    style={{ background: `${feat.accentColor}07`, borderColor: `${feat.accentColor}18` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${feat.accentColor}35`; e.currentTarget.style.boxShadow = `0 8px 30px ${feat.accentColor}12` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${feat.accentColor}18`; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${feat.accentColor}15 0%, transparent 70%)` }} />
                    <div className="absolute bottom-0 left-0 w-32 h-32 opacity-25 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, ${feat.accentColor}30 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${feat.accentColor}15`, border: `1px solid ${feat.accentColor}28` }}>
                          <Icon size={18} style={{ color: feat.accentColor }} />
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-['Space_Mono'] tracking-widest uppercase border font-medium"
                          style={{ background: `${feat.accentColor}10`, color: feat.accentColor, borderColor: `${feat.accentColor}25` }}>
                          {feat.badge}
                        </span>
                      </div>
                      <h3 className="font-['Syne'] font-bold text-xl text-[#0d2b2b] mb-1.5">{feat.title}</h3>
                      <p className="font-['Space_Mono'] text-xs mb-3" style={{ color: feat.accentColor }}>"{feat.tagline}"</p>
                      <p className="text-[#0d2b2b]/50 text-sm leading-relaxed mb-4">{feat.desc}</p>
                      {feat.chips && (
                        <div className="flex flex-wrap gap-1.5">
                          {feat.chips.map((chip) => (
                            <span key={chip} className="px-2.5 py-1 rounded-lg text-xs font-['Space_Mono']"
                              style={{ color: `${feat.accentColor}cc`, background: `${feat.accentColor}0d`, border: `1px solid ${feat.accentColor}20` }}>
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                      {feat.demo && (
                        <div className="rounded-xl p-3 font-['Space_Mono'] text-xs leading-relaxed"
                          style={{ background: 'rgba(13,43,43,0.05)', borderLeft: `2px solid ${feat.accentColor}50`, color: `${feat.accentColor}99` }}>
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
              <span className="font-['Space_Mono'] text-[9px] tracking-[0.25em] uppercase text-[#0d2b2b]/30">Full Platform</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(0,128,128,0.15)]" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {standard.map((feat) => {
                const Icon = feat.icon
                return (
                  <div key={feat.title}
                    className="group p-5 rounded-2xl border border-[rgba(0,128,128,0.1)] bg-[rgba(0,128,128,0.03)] hover:border-[rgba(0,128,128,0.25)] hover:bg-[rgba(0,128,128,0.07)] transition-all duration-300 cursor-default">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${feat.color}10`, border: `1px solid ${feat.color}20` }}>
                      <Icon size={16} style={{ color: feat.color }} />
                    </div>
                    <h4 className="font-['Syne'] font-bold text-sm text-[#0d2b2b] mb-1.5">{feat.title}</h4>
                    <p className="text-[#0d2b2b]/45 text-xs leading-relaxed">{feat.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 relative overflow-hidden" style={{ background: '#ecdcc0' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.2)] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.15)] to-transparent" />
          <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle,rgba(0,128,128,0.06) 0%,transparent 70%)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 xl:px-20">
          <div className="max-w-xl mb-14 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#9a6e3a]" />
              <span className="font-['Space_Mono'] text-[10px] tracking-[0.22em] uppercase text-[#9a6e3a]">How It Works</span>
            </div>
            <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
              From your goal to a<span className="grad-teal"> live portfolio</span><br />in five phases.
            </h2>
            <p className="text-[#0d2b2b]/50 text-base">A rigorous quant pipeline — transparent at every step.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-[180px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(0,128,128,0.25)] to-transparent" />
            <div className="space-y-1">
              {phases.map((p, i) => {
                const Icon = p.icon
                return (
                  <div key={p.num} className={`group grid lg:grid-cols-[180px_1fr] gap-6 items-start animate-fade-up delay-${(i + 1) * 100}`}>
                    <div className="hidden lg:flex flex-col items-end pr-8 pt-5 gap-0.5">
                      <span className="font-['Syne'] font-bold text-3xl opacity-15 group-hover:opacity-50 transition-all duration-300" style={{ color: p.color }}>{p.num}</span>
                      <span className="font-['Space_Mono'] text-[8px] tracking-widest uppercase text-[#0d2b2b]/25">{p.phase}</span>
                    </div>
                    <div className="hidden lg:flex absolute w-3 h-3 rounded-full border-2 border-[#ecdcc0] z-10 group-hover:scale-150 transition-transform duration-300 top-[26px]"
                      style={{ left: '175px', background: p.color }} />
                    <div className="lg:pl-10 py-3">
                      <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 cursor-default"
                        style={{ background: `${p.color}07`, borderColor: `${p.color}18` }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.color}35`; e.currentTarget.style.boxShadow = `0 4px 20px ${p.color}12` }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.color}18`; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}12`, border: `1px solid ${p.color}22` }}>
                            <Icon size={16} style={{ color: p.color }} />
                          </div>
                          <div>
                            <span className="lg:hidden font-['Space_Mono'] text-[8px] tracking-widest uppercase text-[#0d2b2b]/25">{p.phase} · </span>
                            <h3 className="font-['Syne'] font-bold text-lg text-[#0d2b2b]">{p.title}</h3>
                          </div>
                        </div>
                        <p className="text-[#0d2b2b]/50 text-sm leading-relaxed mb-4">{p.desc}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.details.map((d, di) => (
                            <span key={d} className="px-2.5 py-1 rounded-lg text-xs font-['Space_Mono']"
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
        </div>
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section ref={ctaRef} className="relative overflow-hidden pt-16 pb-24" style={{ background: '#F4E1C1' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,128,128,0.18)] to-transparent" />
        <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,128,128,0.07) 0%, transparent 70%)' }} />
        <div className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(154,110,58,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,128,128,0.6) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

        <div className="max-w-7xl mx-auto px-6 xl:px-20 relative z-10">
          <div className="flex items-center gap-4 mb-14">
            <div className="h-px w-12 bg-[rgba(0,128,128,0.2)]" />
            <span className="font-['Space_Mono'] text-[9px] tracking-[0.28em] uppercase text-[#0d2b2b]/35">Start now · Free</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 xl:gap-28 items-center">
            {/* Left: headline */}
            <div style={{ opacity: ctaInView ? 1 : 0, transform: ctaInView ? 'translateX(0)' : 'translateX(-28px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
              <h2 className="font-['Syne'] font-extrabold leading-[1.02] tracking-[-0.025em] mb-8"
                style={{ fontSize: 'clamp(2.4rem,4.5vw,3.8rem)' }}>
                <span className="block text-[#0d2b2b]">Your portfolio,</span>
                <span className="block grad-teal">built by math.</span>
                <span className="block" style={{ background: 'linear-gradient(135deg, #9a6e3a, #c49a60)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Checked by AI.
                </span>
                <span className="block text-[#0d2b2b]/50">Explained in English.</span>
              </h2>

              <p className="text-[#0d2b2b]/45 text-lg leading-[1.78] max-w-[420px] mb-10">
                No credit card. No sign-in wall. Just answer a few questions about your goals and risk appetite — your portfolio is ready in under 2 minutes.
              </p>

              <div className="flex items-center gap-6 mb-10">
                {[{ icon: '⚡', text: 'Ready in 2 min' }, { icon: '🔒', text: 'No card needed' }, { icon: '✦', text: 'Free to start' }].map(g => (
                  <div key={g.text} className="flex items-center gap-2">
                    <span className="text-xs">{g.icon}</span>
                    <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.16em] text-[#0d2b2b]/38">{g.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/analyze' : '/auth/register')}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
                  style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 4px 28px rgba(0,128,128,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#006666'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(0,128,128,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#008080'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(0,128,128,0.3)' }}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Build My Portfolio'}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/questionnaire' : '/auth/register')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-sm transition-all duration-200"
                  style={{ color: 'rgba(13,43,43,0.55)', border: '1px solid rgba(0,128,128,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#008080'; e.currentTarget.style.borderColor = 'rgba(0,128,128,0.4)'; e.currentTarget.style.background = 'rgba(0,128,128,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(13,43,43,0.55)'; e.currentTarget.style.borderColor = 'rgba(0,128,128,0.2)'; e.currentTarget.style.background = 'transparent' }}
                >
                  Try Questionnaire →
                </button>
              </div>
            </div>

            {/* Right: donut chart */}
            <div className="flex flex-col items-center gap-8"
              style={{ opacity: ctaInView ? 1 : 0, transform: ctaInView ? 'translateX(0)' : 'translateX(28px)', transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s' }}>
              <div className="flex items-center gap-3 self-start">
                <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.22em] text-[#0d2b2b]/30">Sample allocation</span>
                <div className="h-px w-12 bg-[rgba(0,128,128,0.15)]" />
              </div>
              <div className="relative rounded-3xl p-8"
                style={{ background: 'rgba(232,208,168,0.5)', border: '1px solid rgba(0,128,128,0.12)', boxShadow: '0 4px 32px rgba(0,128,128,0.06)' }}>
                <DonutChart animate={ctaInView} />
              </div>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {SEGMENTS.map((s, i) => (
                  <div key={s.ticker} className="flex items-center gap-1.5"
                    style={{ opacity: ctaInView ? 1 : 0, transition: `opacity 0.4s ease ${0.5 + i * 0.1}s` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, opacity: s.opacity }} />
                    <span className="font-['Space_Mono'] text-[8px] uppercase tracking-widest text-[#0d2b2b]/45">{s.ticker} {s.pct}%</span>
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

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="py-10 border-t border-[rgba(0,128,128,0.1)]" style={{ background: '#F4E1C1' }}>
        <div className="max-w-7xl mx-auto px-6 xl:px-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: '#008080' }}>
                <span className="font-['Syne'] font-extrabold text-[#F4E1C1] text-sm">A</span>
              </div>
              <div>
                <div className="font-['Syne'] font-extrabold text-sm tracking-[0.06em] text-[#0d2b2b]">ASSETS</div>
                <div className="font-['Space_Mono'] text-[7px] tracking-widest text-[#008080]/45 uppercase">AI Portfolio Engine</div>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              {[
                { label: 'Features',    href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Sign In',     href: '/auth/login', isRoute: true },
                { label: 'Get Started', href: '/auth/register', isRoute: true },
              ].map((l) =>
                l.isRoute ? (
                  <Link key={l.label} to={l.href} className="text-sm text-[#0d2b2b]/40 hover:text-[#008080] transition-colors duration-200">{l.label}</Link>
                ) : (
                  <a key={l.label} href={l.href} className="text-sm text-[#0d2b2b]/40 hover:text-[#008080] transition-colors duration-200">{l.label}</a>
                )
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#008080] ripple" />
                <span className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/30">All systems live</span>
              </div>
              <div className="w-px h-3 bg-[rgba(0,128,128,0.15)]" />
              <span className="font-['Space_Mono'] text-[9px] text-[#0d2b2b]/25">© 2026 ASSETS</span>
            </div>
          </div>

          <p className="mt-6 text-center font-['Space_Mono'] text-[9px] text-[#0d2b2b]/20 leading-relaxed">
            Not SEBI registered. For educational &amp; research purposes only. Not financial advice.
          </p>
        </div>
      </footer>

    </div>
  )
}
