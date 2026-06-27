import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorStore } from '../store/investorStore'

const SECTIONS = [
  { label: 'Welcome' },
  { label: 'Capital & Risk' },
  { label: 'Time Horizon' },
  { label: 'Sectors' },
  { label: 'Style & Goal' },
]

const CAPITAL_OPTIONS = [
  'Under ₹25,000',
  '₹25,000 – ₹1,00,000',
  '₹1,00,000 – ₹5,00,000',
  'Above ₹5,00,000',
]

const RISK_OPTIONS = [
  'Cannot afford any loss',
  'Up to 15% loss',
  'Up to 25% loss',
  'High risk, high reward',
]

const HORIZON_OPTIONS = [
  'Within 3 months',
  '3–12 months',
  '1–3 years',
  '3+ years',
]

const SECTOR_OPTIONS = [
  'Technology',
  'Banking and Finance',
  'Pharmaceuticals',
  'Energy and Oil',
  'FMCG and Consumer',
  'EVs and Green Energy',
  'Infrastructure',
  'Defence and PSUs',
  'No preference — show all',
]

const INVESTOR_OPTIONS = [
  'Safety First',
  'Balanced Growth',
  'Growth Seeker',
  'Trader Mindset',
]

const FREQ_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Set and forget']

function ProgressDots({ current }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-0">
        {SECTIONS.map((s, i) => (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 sm:w-12 h-0.5 ${
                  i <= current ? 'bg-[#2a78d6]' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`w-4 h-4 rounded-full shrink-0 border-2 transition-colors ${
                i <= current
                  ? 'bg-[#2a78d6] border-[#2a78d6]'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">
        {SECTIONS[current].label}
      </p>
    </div>
  )
}

function RadioCard({ name, options, value, onChange }) {
  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <label
            key={opt}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selected
                ? 'border-[#2a78d6] bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={selected}
              onChange={() => onChange(opt)}
              className="accent-[#2a78d6]"
            />
            <span className="text-sm font-medium text-gray-800">{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

function SectorChips({ selected, options, onChange }) {
  const handleToggle = (opt) => {
    if (opt === 'No preference — show all') {
      onChange(['No preference — show all'])
      return
    }
    const withoutAll = selected.filter((s) => s !== 'No preference — show all')
    if (withoutAll.includes(opt)) {
      onChange(withoutAll.filter((s) => s !== opt))
    } else {
      onChange([...withoutAll, opt])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => handleToggle(opt)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              isSelected
                ? 'bg-[#2a78d6] text-white border-[#2a78d6]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const setProfile = useInvestorStore((s) => s.setProfile)

  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    capital: '',
    risk: '',
    horizon: '',
    sectors: [],
    investorType: '',
    checkFreq: '',
    goal: '',
  })
  const [error, setError] = useState('')

  const update = (key) => (val) => {
    setFormData((prev) => ({ ...prev, [key]: val }))
    setError('')
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return true
      case 1:
        return !!formData.capital && !!formData.risk
      case 2:
        return !!formData.horizon
      case 3:
        return formData.sectors.length > 0
      case 4:
        return !!formData.investorType && !!formData.checkFreq
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please select an option')
      return
    }
    setError('')
    if (step < 4) setStep((s) => s + 1)
  }

  const handleBack = () => {
    setError('')
    if (step > 0) setStep((s) => s - 1)
  }

  const handleSubmit = () => {
    if (!canProceed()) {
      setError('Please select an option')
      return
    }
    setProfile(formData)
    navigate('/summary')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        {step > 0 && <ProgressDots current={step} />}

        {step === 0 && (
          <div className="text-center py-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Tell us about yourself
            </h1>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              We'll build your personal quant strategy in 60 seconds
            </p>
            <button
              onClick={() => setStep(1)}
              className="px-8 py-3 text-sm font-semibold rounded-xl bg-[#2a78d6] text-white hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                How much are you investing?
              </h2>
              <RadioCard
                name="capital"
                options={CAPITAL_OPTIONS}
                value={formData.capital}
                onChange={update('capital')}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                How much loss can you handle?
              </h2>
              <RadioCard
                name="risk"
                options={RISK_OPTIONS}
                value={formData.risk}
                onChange={update('risk')}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              When do you need this money back?
            </h2>
            <RadioCard
              name="horizon"
              options={HORIZON_OPTIONS}
              value={formData.horizon}
              onChange={update('horizon')}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Which sectors interest you?
            </h2>
            <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
            <SectorChips
              selected={formData.sectors}
              options={SECTOR_OPTIONS}
              onChange={update('sectors')}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                What kind of investor are you?
              </h2>
              <RadioCard
                name="investorType"
                options={INVESTOR_OPTIONS}
                value={formData.investorType}
                onChange={update('investorType')}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                How often will you check?
              </h2>
              <RadioCard
                name="checkFreq"
                options={FREQ_OPTIONS}
                value={formData.checkFreq}
                onChange={update('checkFreq')}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                In your own words, what's your goal?
              </h2>
              <p className="text-sm text-gray-500 mb-3">Optional</p>
              <textarea
                value={formData.goal}
                onChange={(e) => update('goal')(e.target.value)}
                placeholder="e.g. Save for my wedding in 1 year"
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#2a78d6] focus:ring-1 focus:ring-[#2a78d6] transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
            {error}
          </p>
        )}

        {step > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#2a78d6] text-white hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#2a78d6] text-white hover:bg-blue-700 transition-colors"
              >
                Build My Strategy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
