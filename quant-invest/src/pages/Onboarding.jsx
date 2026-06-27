import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorStore } from '../store/investorStore'
import LiveMarketTicker from '../components/onboarding/LiveMarketTicker'

const SECTIONS = [
  { label: 'Welcome' },
  { label: 'Capital & Risk' },
  { label: 'Time Horizon' },
  { label: 'Sectors' },
  { label: 'Style & Goal' },
]

const CAPITAL_OPTIONS  = ['Under ₹25,000', '₹25,000 – ₹1,00,000', '₹1,00,000 – ₹5,00,000', 'Above ₹5,00,000']
const RISK_OPTIONS     = ['Cannot afford any loss', 'Up to 15% loss', 'Up to 25% loss', 'High risk, high reward']
const HORIZON_OPTIONS  = ['Within 3 months', '3–12 months', '1–3 years', '3+ years']
const SECTOR_OPTIONS   = ['Technology','Banking and Finance','Pharmaceuticals','Energy and Oil','FMCG and Consumer','EVs and Green Energy','Infrastructure','Defence and PSUs','No preference — show all']
const INVESTOR_OPTIONS = ['Safety First', 'Balanced Growth', 'Growth Investing', 'Trader Mindset']
const FREQ_OPTIONS     = ['Daily', 'Weekly', 'Monthly', 'Set and forget']

// ── Progress bar ──────────────────────────────────────────────────
function ProgressBar({ current }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-center gap-0">
        {SECTIONS.map((s, i) => (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div className="w-10 sm:w-14 h-0.5 transition-all" style={{ background: i <= current ? '#008080' : 'rgba(0,128,128,0.15)' }} />
            )}
            <div className="w-4 h-4 rounded-full shrink-0 border-2 transition-all flex items-center justify-center" style={{
              background: i < current ? '#008080' : i === current ? '#F4E1C1' : 'transparent',
              borderColor: i <= current ? '#008080' : 'rgba(0,128,128,0.25)',
            }}>
              {i < current && <span style={{ fontSize: '8px', color: '#F4E1C1' }}>✓</span>}
              {i === current && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#008080', display: 'inline-block' }} />}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center mt-2 text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.45)', letterSpacing: '0.1em' }}>
        Step {current} of {SECTIONS.length - 1} — {SECTIONS[current].label}
      </p>
    </div>
  )
}

// ── Radio card ────────────────────────────────────────────────────
function RadioCard({ name, options, value, onChange }) {
  return (
    <div className="space-y-2.5">
      {options.map(opt => {
        const sel = value === opt
        return (
          <label key={opt} className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all" style={{
            border: `1.5px solid ${sel ? '#008080' : 'rgba(0,128,128,0.15)'}`,
            background: sel ? 'rgba(0,128,128,0.06)' : 'rgba(244,225,193,0.4)',
          }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = 'rgba(0,128,128,0.3)' }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'rgba(0,128,128,0.15)' }}
          >
            <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all" style={{
              borderColor: sel ? '#008080' : 'rgba(0,128,128,0.3)',
              background: sel ? '#008080' : 'transparent',
            }}>
              {sel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F4E1C1' }} />}
            </div>
            <input type="radio" name={name} value={opt} checked={sel} onChange={() => onChange(opt)} className="hidden" />
            <span className="text-sm font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif', color: sel ? '#008080' : '#0d2b2b' }}>{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

// ── Sector chips ──────────────────────────────────────────────────
function SectorChips({ selected, options, onChange }) {
  const toggle = (opt) => {
    if (opt === 'No preference — show all') { onChange(['No preference — show all']); return }
    const without = selected.filter(s => s !== 'No preference — show all')
    onChange(without.includes(opt) ? without.filter(s => s !== opt) : [...without, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const sel = selected.includes(opt)
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              background: sel ? '#008080' : 'rgba(0,128,128,0.05)',
              color: sel ? '#F4E1C1' : '#0d2b2b',
              border: `1.5px solid ${sel ? '#008080' : 'rgba(0,128,128,0.2)'}`,
            }}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────
function Q({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#0d2b2b' }}>{children}</h2>
      {sub && <p className="mt-0.5 text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.45)' }}>{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate   = useNavigate()
  const setProfile = useInvestorStore(s => s.setProfile)

  const [step, setStep]     = useState(0)
  const [formData, setFD]   = useState({ capital: '', risk: '', horizon: '', sectors: [], investorType: '', checkFreq: '', goal: '' })
  const [error, setError]   = useState('')

  const update = key => val => { setFD(p => ({ ...p, [key]: val })); setError('') }

  const canProceed = () => {
    if (step === 0) return true
    if (step === 1) return !!formData.capital && !!formData.risk
    if (step === 2) return !!formData.horizon
    if (step === 3) return formData.sectors.length > 0
    if (step === 4) return !!formData.investorType && !!formData.checkFreq
    return false
  }

  const next = () => {
    if (!canProceed()) { setError('Please make a selection to continue'); return }
    setError(''); setStep(s => s + 1)
  }
  const back = () => { setError(''); setStep(s => s - 1) }
  const submit = () => {
    if (!canProceed()) { setError('Please make a selection to continue'); return }
    setProfile(formData); navigate('/summary')
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8" style={{ background: '#F4E1C1' }}>
      {/* subtle grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(rgba(0,128,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,128,128,1) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
      }} />

      <div className="relative w-full max-w-5xl">

        {/* top wordmark */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#008080,#006666)' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#F4E1C1', fontSize: '13px' }}>A</span>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#0d2b2b', fontSize: '16px', letterSpacing: '0.05em' }}>ASSETS</span>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full" style={{ fontFamily: 'Space Mono, monospace', color: '#008080', background: 'rgba(0,128,128,0.08)', border: '1px solid rgba(0,128,128,0.18)' }}>
            Quant Strategy Builder
          </span>
        </div>

        {/* card */}
        <div className="rounded-3xl p-6 sm:p-10" style={{
          background: 'rgba(244,225,193,0.85)',
          border: '1px solid rgba(0,128,128,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,128,128,0.08)',
        }}>

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <div>
              <LiveMarketTicker />

              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(0,128,128,0.08)', border: '1px solid rgba(0,128,128,0.18)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#008080', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                  <span className="text-xs" style={{ fontFamily: 'Space Mono, monospace', color: '#008080' }}>AI-Powered Portfolio Engine</span>
                </div>

                <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#0d2b2b', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  Tell us about yourself
                </h1>
                <p className="mt-3 text-sm max-w-sm mx-auto" style={{ color: 'rgba(13,43,43,0.5)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.7 }}>
                  We'll build your personal quant strategy in 60 seconds using ML signals, Markowitz optimisation, and live NSE data.
                </p>

                <button onClick={() => setStep(1)}
                  className="mt-8 px-8 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98]"
                  style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 4px 24px rgba(0,128,128,0.3)', fontFamily: 'Space Grotesk, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#006666' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}>
                  Get Started →
                </button>

                <p className="mt-5 text-xs" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.28)', letterSpacing: '0.1em' }}>
                  NOT SEBI REGISTERED · EDUCATIONAL USE ONLY
                </p>
              </div>
            </div>
          )}

          {/* ── STEPS 1–4 ── */}
          {step > 0 && (
            <div>
              <ProgressBar current={step} />

              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Q sub="Select the range that matches your budget">How much are you investing?</Q>
                    <RadioCard name="capital" options={CAPITAL_OPTIONS} value={formData.capital} onChange={update('capital')} />
                  </div>
                  <div>
                    <Q sub="This determines your risk profile">How much loss can you handle?</Q>
                    <RadioCard name="risk" options={RISK_OPTIONS} value={formData.risk} onChange={update('risk')} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-lg mx-auto">
                  <Q sub="Helps us pick the right stocks for your timeline">When do you need this money back?</Q>
                  <RadioCard name="horizon" options={HORIZON_OPTIONS} value={formData.horizon} onChange={update('horizon')} />
                </div>
              )}

              {step === 3 && (
                <div>
                  <Q sub="Select all that apply — we'll fetch live stocks from these sectors">Which sectors interest you?</Q>
                  <SectorChips selected={formData.sectors} options={SECTOR_OPTIONS} onChange={update('sectors')} />
                </div>
              )}

              {step === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Q sub="Sets your portfolio allocation strategy">What kind of investor are you?</Q>
                    <RadioCard name="investorType" options={INVESTOR_OPTIONS} value={formData.investorType} onChange={update('investorType')} />
                  </div>
                  <div>
                    <Q sub="We'll tailor alerts to your schedule">How often will you check your portfolio?</Q>
                    <RadioCard name="checkFreq" options={FREQ_OPTIONS} value={formData.checkFreq} onChange={update('checkFreq')} />
                    <div className="mt-5">
                      <Q sub="Optional">In your own words, what's your goal?</Q>
                      <textarea
                        value={formData.goal}
                        onChange={e => update('goal')(e.target.value)}
                        placeholder="e.g. Save for my wedding in 1 year"
                        rows={3}
                        className="w-full p-4 text-sm rounded-2xl resize-none focus:outline-none transition-all"
                        style={{
                          fontFamily: 'Space Grotesk, sans-serif',
                          color: '#0d2b2b',
                          background: 'rgba(244,225,193,0.4)',
                          border: '1.5px solid rgba(0,128,128,0.2)',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#008080' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,128,128,0.2)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-5 text-xs p-3 rounded-xl" style={{ color: '#9a6e3a', background: 'rgba(154,110,58,0.08)', border: '1px solid rgba(154,110,58,0.2)', fontFamily: 'Space Mono, monospace' }}>
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid rgba(0,128,128,0.1)' }}>
                <button onClick={back}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all"
                  style={{ border: '1.5px solid rgba(0,128,128,0.2)', color: 'rgba(13,43,43,0.55)', fontFamily: 'Space Grotesk, sans-serif', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#008080'; e.currentTarget.style.color = '#008080' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,128,128,0.2)'; e.currentTarget.style.color = 'rgba(13,43,43,0.55)' }}>
                  ← Back
                </button>

                <div className="flex items-center gap-3">
                  <p className="text-xs hidden sm:block" style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(13,43,43,0.3)' }}>
                    {step} / {SECTIONS.length - 1}
                  </p>
                  {step < 4 ? (
                    <button onClick={next}
                      className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
                      style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 2px 12px rgba(0,128,128,0.25)', fontFamily: 'Space Grotesk, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#006666' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={submit}
                      className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
                      style={{ background: '#008080', color: '#F4E1C1', boxShadow: '0 2px 12px rgba(0,128,128,0.25)', fontFamily: 'Space Grotesk, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#006666' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#008080' }}>
                      Build My Strategy →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
