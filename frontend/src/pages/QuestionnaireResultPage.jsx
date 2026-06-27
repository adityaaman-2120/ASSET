import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ClipboardCheck, ArrowLeft } from 'lucide-react'
import PortfolioVisualizer from '../components/PortfolioVisualizer'
import Button from '../components/Button'

export default function QuestionnaireResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const portfolioData = state?.portfolio

  useEffect(() => {
    if (!portfolioData) {
      navigate('/questionnaire')
    }
  }, [portfolioData, navigate])

  if (!portfolioData) {
    return null
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-[#00D4FF]" />
            Risk Profile Strategy Optimized
          </h1>
          <p className="text-sm text-slate-400">
            Portfolio compiled successfully from questionnaire profile. Portfolio ID:{' '}
            <span className="font-mono text-xs text-slate-300">{portfolioData.portfolio?.id}</span>
          </p>
        </div>
      </div>

      <PortfolioVisualizer data={portfolioData} />
    </div>
  )
}
