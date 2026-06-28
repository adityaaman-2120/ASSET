import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, MessageSquare, AlertCircle, Settings } from 'lucide-react'
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

  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  const [newRiskLevel, setNewRiskLevel] = useState('medium')
  const [rebalanceLoading, setRebalanceLoading] = useState(false)
  const [rebalanceSuccess, setRebalanceSuccess] = useState('')

  async function fetchPortfolioDetails() {
    try {
      const { data: res } = await api.get(`/api/v1/analysis/portfolio/${portfolioId}`)

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
    } catch {
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
      await fetchPortfolioDetails()
    } catch {
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
        <Card className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="text-xl font-bold text-[#0d2b2b]">Error Loading Portfolio</h2>
          <p className="text-xs text-red-700 bg-red-500/10 p-3 rounded-lg border border-red-600/20 leading-relaxed font-mono">
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
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-[#008080] hover:underline flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-[#0d2b2b] tracking-tight">
            {data.portfolio?.name}
          </h1>
          <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">
            Portfolio Value:{' '}
            <span className="font-bold text-[#0d2b2b] font-mono">
              ₹{data.portfolio?.amount?.toLocaleString('en-IN')}
            </span>{' '}
            | Target Risk:{' '}
            <span className="font-bold text-[#0d2b2b] capitalize">{data.portfolio?.risk_level}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Portfolio Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          <PortfolioVisualizer data={data} />
        </div>

        {/* Right: Rebalance + Chat */}
        <div className="space-y-6">
          {/* Rebalance */}
          <Card className="space-y-4">
            <h3 className="text-sm font-black text-[#0d2b2b] flex items-center gap-1.5 uppercase tracking-wider">
              <Settings className="h-4 w-4 text-[#008080]" />
              Strategy Rebalancing
            </h3>
            <p className="text-xs text-[rgba(13,43,43,0.5)]">
              Change the target risk constraint to re-run the optimizer with new holding weights.
            </p>

            <div className="flex gap-2">
              <select
                value={newRiskLevel}
                onChange={(e) => setNewRiskLevel(e.target.value)}
                className="flex-1 rounded-lg border border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.5)] px-3 py-2 text-xs text-[#0d2b2b] focus:border-[#008080] focus:outline-none"
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
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-500/10 border border-emerald-600/20 rounded p-2 text-center">
                {rebalanceSuccess}
              </p>
            )}
          </Card>

          {/* What-If Chat */}
          <Card className="flex flex-col h-[480px] justify-between">
            <div className="space-y-3 flex-1 min-h-0">
              <h3 className="text-sm font-black text-[#0d2b2b] flex items-center gap-1.5 uppercase tracking-wider border-b border-[rgba(0,128,128,0.15)] pb-3">
                <MessageSquare className="h-4 w-4 text-[#9a6e3a]" />
                What-If AI Advisor
              </h3>

              <div className="h-[310px] overflow-y-auto space-y-3 pr-1 text-xs">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-[rgba(13,43,43,0.4)] py-12 px-4 italic leading-relaxed">
                    Ask questions about this strategy, e.g.:
                    <div className="mt-2 text-[10px] not-italic text-[rgba(13,43,43,0.5)] space-y-1">
                      <p>"Why did you allocate to tech?"</p>
                      <p>"What is the impact of a Nifty 10% drop?"</p>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[rgba(0,128,128,0.08)] border border-[rgba(0,128,128,0.15)] text-[#0d2b2b] ml-6'
                          : 'bg-[rgba(244,225,193,0.5)] border border-[rgba(0,128,128,0.15)] text-[rgba(13,43,43,0.8)] mr-6'
                      }`}
                    >
                      <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${
                        msg.role === 'user' ? 'text-[#008080]' : 'text-[#9a6e3a]'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'AI Advisor'}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="bg-[rgba(244,225,193,0.5)] border border-[rgba(0,128,128,0.15)] p-3 rounded-xl mr-6">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#9a6e3a] block mb-1">
                      AI Advisor
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-[#008080] rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSendQuestion} className="flex gap-2 border-t border-[rgba(0,128,128,0.15)] pt-3 mt-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask advisor…"
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-[rgba(0,128,128,0.2)] bg-[rgba(244,225,193,0.5)] px-3 py-2 text-xs text-[#0d2b2b] placeholder-[rgba(13,43,43,0.35)] focus:border-[#008080] focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !question.trim()}
                className="p-2 disabled:opacity-50 text-[#F4E1C1] rounded-lg transition-colors cursor-pointer"
                style={{ background: '#008080' }}
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
