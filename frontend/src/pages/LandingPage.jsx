import React, { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Cpu, Database, Eye, ChevronDown,
  TrendingUp, Zap, Shield, BarChart2, CheckCircle,
  Sparkles, Activity,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

// ─── Animated background grid ────────────────────────────────────────────────

function GridBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Radial cyan glow */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-[0.07]"
        style={{ background: 'radial-gradient(ellipse at center, #00D4FF 0%, transparent 70%)' }}
      />
      {/* Purple bottom glow */}
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[400px] opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse at bottom right, #7C3AED 0%, transparent 70%)' }}
      />
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#94a3b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

// ─── Floating stat pill ───────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${color}`}>
      <span className="font-mono">{value}</span>
      <span className="font-normal text-xs opacity-70">{label}</span>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, iconColor, title, description, delay = 0 }) {
  return (
    <div
      className="group relative p-6 rounded-2xl border border-slate-800/60 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover glow accent */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
        style={{ background: `radial-gradient(circle at top left, ${iconColor}10 0%, transparent 60%)` }} />
      <div className={`inline-flex p-3 rounded-xl mb-4`} style={{ background: `${iconColor}15` }}>
        <Icon className="h-6 w-6" style={{ color: iconColor }} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

// ─── How it works step ────────────────────────────────────────────────────────

function HowStep({ number, title, description, icon: Icon, last = false }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-[#7C3AED]/20 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-[#00D4FF]" />
        </div>
        {!last && <div className="w-px flex-1 mt-3 bg-gradient-to-b from-[#00D4FF]/20 to-transparent" />}
      </div>
      <div className="pb-10 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00D4FF]/60">Step {number}</span>
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const featuresRef = useRef(null)
  const navigate = useNavigate()

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative">
      <GridBg />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-6 py-24">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 text-xs font-bold text-[#00D4FF] mb-8 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
          NSE · BSE · Live Data · XGBoost · SHAP
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.05] mb-6">
          Institutional-grade{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)' }}
          >
            quant analysis.
          </span>
          <br />
          For everyone.
        </h1>

        {/* Subheading */}
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
          Describe your investment goal in plain language.{' '}
          <span className="text-slate-300 font-semibold">Get a data-driven portfolio in 60 seconds</span>{' '}
          — backed by XGBoost forecasts, mean-variance optimization, and LLM risk controls.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-14">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/analyze' : '/auth/register')}
            className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-[#0A0E1A] bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] hover:shadow-[0_0_40px_rgba(0,212,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Sparkles className="h-5 w-5" />
            Start Analyzing
            <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            type="button"
            onClick={scrollToFeatures}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white hover:bg-slate-900/60 transition-all cursor-pointer"
          >
            See Demo
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-3">
          <StatPill value="50+" label="Nifty stocks analysed" color="border-emerald-500/20 bg-emerald-950/20 text-emerald-400" />
          <StatPill value="20+" label="Technical indicators" color="border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF]" />
          <StatPill value="3" label="Historical stress tests" color="border-amber-500/20 bg-amber-950/20 text-amber-400" />
          <StatPill value="SHAP" label="Per-holding explanation" color="border-[#7C3AED]/20 bg-[#7C3AED]/5 text-[#7C3AED]" />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-700">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#00D4FF] mb-3">What makes us different</p>
          <h2 className="text-4xl font-black text-white">Everything you need. Nothing you don't.</h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Every component of the pipeline runs transparently — no black boxes, no vague "AI-powered" claims.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FeatureCard
            icon={Cpu}
            iconColor="#00D4FF"
            title="AI-Powered Brief Extraction"
            description="Just say what you want — '₹5L, medium risk, avoid fossil fuels' — and our Groq-backed Llama model structures it into precise optimizer constraints. No forms to fill."
          />
          <FeatureCard
            icon={Database}
            iconColor="#10B981"
            title="Real Market Data"
            description="Live NSE/BSE OHLCV data from yfinance, with 20+ technical indicators (RSI, Bollinger Bands, ATR), HMM-based market regime detection, and XGBoost return predictions."
            delay={80}
          />
          <FeatureCard
            icon={Eye}
            iconColor="#7C3AED"
            title="Transparent AI"
            description="TreeSHAP explanations for every holding recommendation — see exactly which indicators drove each allocation. Our LLM risk manager then challenges its own output."
            delay={160}
          />
        </div>

        {/* Secondary feature row */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mt-5">
          <FeatureCard
            icon={BarChart2}
            iconColor="#F59E0B"
            title="Portfolio Optimizer"
            description="Mean-variance optimization with Kelly position sizing. Configurable max-weight constraints per stock and per sector, calibrated to your risk profile."
            delay={240}
          />
          <FeatureCard
            icon={Shield}
            iconColor="#EF4444"
            title="Historical Stress Tests"
            description="Simulate your portfolio through 2008 Financial Crisis, COVID-19 crash, and the 2022 correction — instantly. See drawdowns, recovery times, and comparison vs Nifty 50."
            delay={320}
          />
          <FeatureCard
            icon={TrendingUp}
            iconColor="#EC4899"
            title="Interactive Dashboard"
            description="Live market heatmap, portfolio detail pages, rebalancing controls, and a What-If AI advisor that answers plain-English questions about your specific holdings."
            delay={400}
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-16 items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#00D4FF] mb-3">The pipeline</p>
            <h2 className="text-4xl font-black text-white mb-4">From words to weights in 60 seconds.</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              A fully automated quant pipeline runs server-side the moment you confirm your brief — no waiting for a human analyst.
            </p>
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/analyze' : '/auth/register')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-[#0A0E1A] bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] hover:shadow-[0_0_24px_rgba(0,212,255,0.25)] hover:scale-[1.02] transition-all cursor-pointer"
            >
              Try it now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-10 md:mt-0">
            <HowStep
              number={1}
              icon={Sparkles}
              title="Describe Your Goal"
              description="Type your investment goal in plain English. Mention your budget, risk appetite, time horizon, and any sectors to avoid."
            />
            <HowStep
              number={2}
              icon={Cpu}
              title="Quant Pipeline Runs"
              description="LLM extracts constraints → Nifty 500 screened → OHLCV downloaded → XGBoost predictions → mean-variance optimization → SHAP explainability."
            />
            <HowStep
              number={3}
              icon={Activity}
              title="Interactive Dashboard"
              description="Explore your portfolio across 5 tabs: Overview, Holdings, Risk Analysis, Stress Test, and What-If AI advisor."
              last
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="relative p-10 rounded-3xl border border-[#00D4FF]/10 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#7C3AED]/5">
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, #00D4FF06 0%, transparent 70%)' }} />
            <Zap className="mx-auto h-10 w-10 text-[#00D4FF] mb-5" />
            <h2 className="text-4xl font-black text-white mb-4">Ready to build your portfolio?</h2>
            <p className="text-slate-400 mb-8">
              Free to start. No credit card required. Your first analysis runs in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/analyze' : '/auth/register')}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[#0A0E1A] bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] hover:shadow-[0_0_32px_rgba(0,212,255,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Sparkles className="h-5 w-5" />
                {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
              </button>
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/questionnaire' : '/auth/login')}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all cursor-pointer"
              >
                Try Questionnaire →
              </button>
            </div>
            <div className="flex justify-center gap-6 mt-8 text-xs text-slate-600">
              {['No credit card', 'Open source pipeline', 'Real NSE data'].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00D4FF]" />
            <span className="font-black text-white tracking-tight">ASSETS</span>
            <span className="text-slate-600 text-xs ml-2">Quant Portfolio Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/auth/register" className="hover:text-[#00D4FF] transition-colors font-semibold">Get Started</Link>
            <span className="text-slate-700">NSE · BSE · India</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
