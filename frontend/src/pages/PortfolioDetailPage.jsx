import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Send, MessageSquare, AlertCircle, TrendingUp, Settings } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import PortfolioVisualizer from '../components/PortfolioVisualizer'

export default function PortfolioDetailPage() {
  const { portfolioId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // What-If chat states
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  // Rebalance states
  const [newRiskLevel, setNewRiskLevel] = useState('medium')
  const [rebalanceLoading, setRebalanceLoading] = useState(false)
  const [rebalanceSuccess, setRebalanceSuccess] = useState('')

  async function fetchPortfolioDetails() {
    try {
      const { data: res } = await api.get(`/api/v1/analysis/portfolio/${portfolioId}`)
      
      // If the portfolio is not ready yet, redirect to the result polling page
      if (res.portfolio?.status !== 'ready') {
        window.location.href = `/analyze/result/${portfolioId}`
        return
      }

      setData(res)
      setNewRiskLevel(res.portfolio.risk_level || 'medium')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load portfolio details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolioDetails()
  }, [portfolioId])

  async function handleSendQuestion(e) {
    e.preventDefault()
    if (!question.trim() || chatLoading) return

    const userMessage = question.trim()
    setQuestion('')
    setChatHistory((prev) => [...prev, { role: 'user', text: userMessage }])
    setChatLoading(true)

    try {
      const { data: response } = await api.post(`/api/v1/analysis/whatif/${portfolioId}`, {
        question: userMessage,
      })

      setChatHistory((prev) => [...prev, { role: 'advisor', text: response.answer }])
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'advisor', text: 'Sorry, I failed to process your question. Please try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleRebalance() {
    setRebalanceLoading(true)
    setRebalanceSuccess('')
    try {
      await api.post(`/api/v1/analysis/rebalance/${portfolioId}`, {
        new_risk_level: newRiskLevel,
      })
      setRebalanceSuccess(`Successfully rebalanced to ${newRiskLevel} risk.`)
      // Refresh details
      await fetchPortfolioDetails()
    } catch (err) {
      setError('Failed to rebalance portfolio.')
    } finally {
      setRebalanceLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Retrieving portfolio parameters..." />
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="border-red-950 bg-red-950/10 text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-white">Error Loading Portfolio</h2>
          <p className="text-xs text-red-300 bg-slate-950/60 p-3 rounded-lg border border-slate-900 leading-relaxed font-mono">
            {error}
          </p>
          <Link to="/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {data.portfolio?.name}
          </h1>
          <p className="text-sm text-slate-400">
            Portfolio Value: <span className="font-bold text-white font-mono">₹{data.portfolio?.amount?.toLocaleString('en-IN')}</span> | Target Risk:{' '}
            <span className="font-bold text-white capitalize">{data.portfolio?.risk_level}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Portfolio analysis and Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          <PortfolioVisualizer data={data} />
        </div>

        {/* Right Side: Rebalance + What-If Chat */}
        <div className="space-y-6">
          {/* Rebalance Options */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Settings className="h-4 w-4 text-[#00D4FF]" />
              Strategy Rebalancing
            </h3>
            <p className="text-xs text-slate-400">
              Change the target risk constraint. This will re-run the mean-variance optimizer and generate new holding weights.
            </p>

            <div className="flex gap-2">
              <select
                value={newRiskLevel}
                onChange={(e) => setNewRiskLevel(e.target.value)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-white focus:border-[#00D4FF] focus:outline-none"
              >
                <option value="low">Low Risk (Max 10% per stock)</option>
                <option value="medium">Medium Risk (Max 15% per stock)</option>
                <option value="high">High Risk (Max 25% per stock)</option>
              </select>

              <Button
                onClick={handleRebalance}
                disabled={rebalanceLoading || newRiskLevel === data.portfolio?.risk_level}
                variant="secondary"
                className="px-4 py-2 text-xs"
              >
                {rebalanceLoading ? 'Optimizing…' : 'Rebalance'}
              </Button>
            </div>

            {rebalanceSuccess && (
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-500/20 rounded p-2 text-center">
                {rebalanceSuccess}
              </p>
            )}
          </Card>

          {/* What-If AI Advisor Chat */}
          <Card className="flex flex-col h-[480px] justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-800 pb-3">
                <MessageSquare className="h-4 w-4 text-[#7C3AED]" />
                What-If AI Advisor
              </h3>
              
              <div className="h-[310px] overflow-y-auto space-y-3 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 px-4 italic leading-relaxed">
                    Ask questions about this strategy, e.g.:
                    <div className="mt-2 text-[10px] not-italic text-slate-400 space-y-1">
                      <p>"Why did you allocate to tech?"</p>
                      <p>"What is the impact of a Nifty 10% drop?"</p>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-800 text-white ml-6 text-right'
                          : 'bg-[#111827] border border-slate-850 text-slate-300 mr-6'
                      }`}
                    >
                      <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${
                        msg.role === 'user' ? 'text-[#00D4FF]' : 'text-[#7C3AED]'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'AI Advisor'}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))
                )}
                
                {chatLoading && (
                  <div className="bg-[#111827] border border-slate-850 p-3 rounded-lg mr-6 text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#7C3AED] block mb-1">
                      AI Advisor
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSendQuestion} className="flex gap-2 border-t border-slate-800 pt-3 mt-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask advisor..."
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-white focus:border-[#00D4FF] focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !question.trim()}
                className="p-2 bg-[#00D4FF] hover:bg-[#00D4FF]/90 disabled:opacity-50 text-[#0A0E1A] rounded-lg transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
