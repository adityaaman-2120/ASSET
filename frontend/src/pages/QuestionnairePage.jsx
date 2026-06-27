import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'

const QUESTIONS = [
  {
    id: 'investment_goal',
    question: 'What is your primary investment goal?',
    type: 'single_choice',
    options: ['Capital Growth', 'Regular Income', 'Wealth Preservation', 'Tax Saving (ELSS)'],
  },
  {
    id: 'time_horizon',
    question: 'How long can you stay invested?',
    type: 'single_choice',
    options: ['Less than 1 year', '1–3 years', '3–5 years', '5+ years'],
  },
  {
    id: 'risk_appetite',
    question: 'How would you react if your portfolio dropped 20% in a month?',
    type: 'single_choice',
    options: [
      'Sell everything immediately',
      'Sell some to cut losses',
      'Hold and wait',
      'Buy more at the dip',
    ],
  },
  {
    id: 'investment_amount',
    question: 'How much are you looking to invest?',
    type: 'single_choice',
    options: ['Under ₹10,000', '₹10,000–₹50,000', '₹50,000–₹2L', '₹2L–₹10L', 'Above ₹10L'],
  },
  {
    id: 'income_stability',
    question: 'How stable is your monthly income?',
    type: 'single_choice',
    options: [
      'Very stable (salaried)',
      'Somewhat stable',
      'Variable (freelance/business)',
      'No regular income',
    ],
  },
  {
    id: 'existing_investments',
    question: 'What do you already hold? (select all that apply)',
    type: 'multi_choice',
    options: ['FD/RD', 'Mutual Funds', 'Direct Stocks', 'Gold', 'Real Estate', 'None'],
  },
  {
    id: 'sector_preference',
    question: 'Any sectors you prefer or want to avoid?',
    type: 'multi_choice_with_avoid',
    prefer_options: [
      'Technology',
      'Banking & Finance',
      'Healthcare',
      'FMCG',
      'Infrastructure',
      'Energy',
    ],
    avoid_options: ['Defence', 'Tobacco/Alcohol', 'Fossil Fuels', 'Gambling', 'None'],
  },
  {
    id: 'return_expectation',
    question: 'What annual return are you realistically targeting?',
    type: 'single_choice',
    options: [
      '8–10% (FD-like, safe)',
      '10–15% (moderate growth)',
      '15–25% (aggressive growth)',
      '25%+ (high risk, high reward)',
    ],
  },
  {
    id: 'liquidity_need',
    question: 'How soon might you need this money back?',
    type: 'single_choice',
    options: ['Anytime (keep liquid)', '6–12 months', '1–3 years', '3+ years (no rush)'],
  },
]

export default function QuestionnairePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeQuestion = QUESTIONS[currentStep]

  const handleSingleChoiceSelect = (option) => {
    const updatedAnswers = { ...answers, [activeQuestion.id]: option }
    setAnswers(updatedAnswers)
    
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleMultiChoiceToggle = (option) => {
    const currentSelections = answers[activeQuestion.id] || []
    let updated
    if (currentSelections.includes(option)) {
      updated = currentSelections.filter((x) => x !== option)
    } else {
      updated = [...currentSelections, option]
    }
    setAnswers({ ...answers, [activeQuestion.id]: updated })
  }

  const handleSectorPreferenceToggle = (type, option) => {
    // type is 'prefer' or 'avoid'
    const currentVal = answers[activeQuestion.id] || { prefer: [], avoid: [] }
    const selections = currentVal[type] || []
    
    let updatedSelections
    if (selections.includes(option)) {
      updatedSelections = selections.filter((x) => x !== option)
    } else {
      updatedSelections = [...selections, option]
    }
    
    // Ensure mutually exclusive (cannot prefer and avoid the same sector)
    const oppositeType = type === 'prefer' ? 'avoid' : 'prefer'
    const oppositeSelections = (currentVal[oppositeType] || []).filter((x) => x !== option)

    setAnswers({
      ...answers,
      [activeQuestion.id]: {
        [type]: updatedSelections,
        [oppositeType]: oppositeSelections,
      },
    })
  }

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/questionnaire/analyze', {
        answers: answers,
      })

      // Navigate to /questionnaire/result with completed portfolio data
      navigate('/questionnaire/result', { state: { portfolio: data } })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit questionnaire. Please try again.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-6">
        <LoadingSpinner size="lg" message="Orchestrating questionnaire strategy..." />
        <p className="text-xs text-slate-500 italic">
          Running portfolio optimizer, computing SHAP rationales, and compiling Devil's Critique reports.
        </p>
      </div>
    )
  }

  const progressPercent = Math.round(((currentStep + 1) / QUESTIONS.length) * 100)

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <ClipboardList className="h-4 w-4 text-[#00D4FF]" />
            Question {currentStep + 1} of {QUESTIONS.length}
          </span>
          <span className="font-mono text-[#00D4FF]">{progressPercent}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <Card className="border-slate-800 shadow-2xl min-h-[380px] flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-white mb-6 leading-snug">
            {activeQuestion.question}
          </h2>

          {/* Render inputs based on type */}
          {activeQuestion.type === 'single_choice' && (
            <div className="space-y-3">
              {activeQuestion.options.map((option) => {
                const isSelected = answers[activeQuestion.id] === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSingleChoiceSelect(option)}
                    className={`w-full text-left p-3.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-white shadow-[#00D4FF]/5'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#00D4FF]" />}
                  </button>
                )
              })}
            </div>
          )}

          {activeQuestion.type === 'multi_choice' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeQuestion.options.map((option) => {
                const selections = answers[activeQuestion.id] || []
                const isSelected = selections.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleMultiChoiceToggle(option)}
                    className={`text-left p-3.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="h-3 w-3 text-[#00D4FF]" />}
                  </button>
                )
              })}
            </div>
          )}

          {activeQuestion.type === 'multi_choice_with_avoid' && (
            <div className="space-y-5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-2">Preferred Sectors</span>
                <div className="grid grid-cols-2 gap-2">
                  {activeQuestion.prefer_options.map((option) => {
                    const selections = answers[activeQuestion.id]?.prefer || []
                    const isSelected = selections.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSectorPreferenceToggle('prefer', option)}
                        className={`text-left px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-2">Avoided Sectors</span>
                <div className="grid grid-cols-2 gap-2">
                  {activeQuestion.avoid_options.map((option) => {
                    const selections = answers[activeQuestion.id]?.avoid || []
                    const isSelected = selections.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSectorPreferenceToggle('avoid', option)}
                        className={`text-left px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-red-500 bg-red-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <Check className="h-3 w-3 text-red-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-3 mt-4">
            {error}
          </p>
        )}

        {/* Footer controls */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-850">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>

          {currentStep === QUESTIONS.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!answers[activeQuestion.id]}
              className="px-5 py-2 text-xs"
            >
              Analyze Answers
              <Check className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleNext}
              disabled={
                activeQuestion.type === 'single_choice' && !answers[activeQuestion.id]
              }
              className="px-4 py-2 text-xs"
            >
              Next
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
