import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ClipboardCheck, ArrowLeft } from 'lucide-react'
import PortfolioVisualizer from '../components/PortfolioVisualizer'
import LoadingSpinner from '../components/LoadingSpinner'

const SESSION_KEY = 'questionnaire_result'

export default function QuestionnaireResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Use navigation state if available (fresh result)
    if (state?.portfolio) {
      setPortfolioData(state.portfolio)
      // Persist to sessionStorage so refresh works
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.portfolio))
      } catch {}
      setLoading(false)
      return
    }

    // 2. Try sessionStorage (page refresh case)
    try {
      const cached = sessionStorage.getItem(SESSION_KEY)
      if (cached) {
        setPortfolioData(JSON.parse(cached))
        setLoading(false)
        return
      }
    } catch {}

    // 3. Nothing to show — go back to questionnaire
    navigate('/questionnaire', { replace: true })
  }, [state, navigate])

  if (loading || !portfolioData) {
    return <LoadingSpinner message="Loading results…" />
  }

  const portfolioId = portfolioData.portfolio?.id

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#008080] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-[#0d2b2b] tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-[#008080]" />
            Risk Profile Strategy Optimized
          </h1>
          {portfolioId && (
            <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">
              Portfolio compiled from questionnaire profile. ID:{' '}
              <span className="font-mono font-bold text-xs text-[#0d2b2b] bg-[rgba(0,128,128,0.1)] px-2 py-0.5 rounded border border-[rgba(0,128,128,0.2)]">
                {portfolioId}
              </span>
            </p>
          )}
        </div>
      </div>

      <PortfolioVisualizer data={portfolioData} />
    </div>
  )
}
