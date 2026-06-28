import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, ArrowLeft, User, CheckCircle, AlertCircle, Loader2,
  PhoneCall, PhoneOff, Clock, MessageSquare, Volume2,
  Info, BarChart3, Wallet, Activity, Shield, TrendingUp,
  Mic, MicOff, Headphones,
} from 'lucide-react'
import Vapi from '@vapi-ai/web'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY
const vapiAssistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

function fmtINR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

export default function VoiceCallPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState('')
  const vapiRef = useRef(null)
  const transcriptRef = useRef(null)

  const { data: portfolios = [], isLoading: portfoliosLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => (await api.get('/api/v1/portfolios/')).data,
    refetchInterval: 60_000,
    staleTime: 55_000,
  })

  const readyPortfolios = portfolios.filter(p => p.status === 'ready')
  const totalCapital = portfolios.reduce((s, p) => s + (p.amount || 0), 0)

  useEffect(() => {
    transcriptRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const buildPortfolioContext = useCallback(() => {
    const topHoldings = portfolios.slice(0, 5).map(p => ({
      name: p.name,
      amount: p.amount,
      risk: p.risk_level,
      status: p.status,
    }))

    const riskBreakdown = {
      low: portfolios.filter(p => p.risk_level === 'low').length,
      medium: portfolios.filter(p => p.risk_level === 'medium').length,
      high: portfolios.filter(p => p.risk_level === 'high').length,
    }

    const readyMetrics = readyPortfolios.map(p => {
      const m = p.results?.metrics || p.results || {}
      return {
        name: p.name,
        expected_return: m.expected_return,
        volatility: m.volatility,
        sharpe: m.sharpe,
      }
    })

    return {
      user_name: user?.full_name || user?.email || 'Client',
      portfolio_count: String(portfolios.length),
      ready_count: String(readyPortfolios.length),
      total_invested: String(totalCapital),
      risk_breakdown: JSON.stringify(riskBreakdown),
      top_holdings: JSON.stringify(topHoldings),
      ready_metrics: JSON.stringify(readyMetrics),
    }
  }, [portfolios, readyPortfolios, totalCapital, user])

  const startConversation = async () => {
    if (!vapiPublicKey || !vapiAssistantId) {
      setError('VAPI is not configured. Add VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID to .env')
      return
    }
    if (portfolios.length === 0) {
      setError('Create at least one portfolio first before starting a voice session.')
      return
    }

    setError('')

    console.log('[VAPI] Creating instance with public key:', vapiPublicKey?.substring(0, 8) + '...')
    console.log('[VAPI] Assistant ID:', vapiAssistantId)

    const vapi = new Vapi(vapiPublicKey)
    vapiRef.current = vapi
    const context = buildPortfolioContext()
    console.log('[VAPI] Starting with context:', context)

    // Attach event handlers BEFORE start to avoid race conditions
    vapi.on('message', (msg) => {
      console.log('[VAPI] message:', msg.type, msg)
      if (msg.type === 'transcript' && msg.transcript?.text?.trim()) {
        setTranscript(prev => [...prev, {
          role: msg.role || 'assistant',
          text: msg.transcript.text,
          timestamp: new Date().toLocaleTimeString(),
        }])
      }
    })

    vapi.on('speech-start', () => setIsSpeaking(true))
    vapi.on('speech-end', () => setIsSpeaking(false))

    vapi.on('call-end', () => {
      console.log('[VAPI] call ended')
      setIsConnected(false)
      setIsSpeaking(false)
      setIsMuted(false)
      vapiRef.current = null
    })

    vapi.on('error', (e) => {
      console.error('[VAPI] error event:', e)
      setError(typeof e === 'string' ? e : e?.message || 'Voice assistant encountered an error. Please try again.')
    })

    try {
      setIsConnected(true)
      await vapi.start(vapiAssistantId, {
        variableValues: context,
        firstMessage: (
          `Hi ${context.user_name}! I'm your ASSETS portfolio advisor. ` +
          `You have ${context.portfolio_count} portfolio(s) with a total investment of ₹${parseInt(context.total_invested).toLocaleString('en-IN')}. ` +
          `I can discuss your holdings, risk levels, performance, and answer any questions. ` +
          `What would you like to explore?`
        ),
      })
    } catch (err) {
      console.error('VAPI start failed:', err)
      setError(err?.message || 'Failed to start voice session. Check your microphone permissions and try again.')
      setIsConnected(false)
      vapiRef.current = null
    }
  }

  const stopConversation = () => {
    if (vapiRef.current) {
      vapiRef.current.stop()
      vapiRef.current = null
    }
    setIsConnected(false)
    setIsSpeaking(false)
    setIsMuted(false)
  }

  const toggleMute = () => {
    if (vapiRef.current) {
      const muted = !vapiRef.current.isMuted()
      vapiRef.current.setMuted(muted)
      setIsMuted(muted)
    }
  }

  return (
    <div className="space-y-6 py-6">
      <Link to="/dashboard" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1 mb-1 font-medium">
        <ArrowLeft className="h-3 w-3" /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Phone className="h-7 w-7 text-emerald-400" />
            Voice Portfolio Advisor
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Talk to your AI advisor about your portfolios using your browser microphone.
          </p>
        </div>
        <Badge variant={isAuthenticated ? 'success' : 'gray'}>
          {isAuthenticated ? 'Authenticated' : 'Guest'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/30 border-slate-800/60 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Invested</p>
            <p className="text-xl font-black text-white font-mono">{fmtINR(totalCapital)}</p>
          </div>
        </Card>
        <Card className="bg-slate-900/30 border-slate-800/60 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Portfolios</p>
            <p className="text-xl font-black text-white font-mono">{portfolios.length}</p>
          </div>
        </Card>
        <Card className="bg-slate-900/30 border-slate-800/60 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ready for Discussion</p>
            <p className="text-xl font-black text-white font-mono">{readyPortfolios.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Voice Conversation Card */}
          <Card className={`border ${isConnected ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800/60'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isConnected ? (
                  <><Volume2 className="h-5 w-5 text-emerald-400" /> Voice Session Active</>
                ) : (
                  <><Mic className="h-5 w-5 text-[#00D4FF]" /> Start a Conversation</>
                )}
              </h2>
              {isConnected && (
                <Badge variant="success">
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    {isSpeaking ? 'Speaking' : 'Listening'}
                  </span>
                </Badge>
              )}
            </div>

            {/* Transcript area */}
            {isConnected && (
              <div className="h-64 overflow-y-auto mb-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-sm">
                {transcript.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <Headphones className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="italic">Say something to start the conversation...</p>
                  </div>
                ) : (
                  transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-white'
                          : 'bg-slate-800/60 border border-slate-700/60 text-slate-200'
                      }`}>
                        <span className={`text-[10px] font-bold block mb-0.5 ${
                          msg.role === 'user' ? 'text-[#00D4FF]' : 'text-emerald-400'
                        }`}>
                          {msg.role === 'user' ? 'You' : 'Advisor'}
                        </span>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptRef} />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isConnected ? (
                <Button
                  onClick={startConversation}
                  disabled={portfolios.length === 0}
                  className="px-8 py-4 text-base"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Start Voice Session
                </Button>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={stopConversation}
                    className="p-3 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-500 transition-all cursor-pointer"
                    title="End Session"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1 justify-center">
                <AlertCircle className="h-3 w-3" /> {error}
              </p>
            )}
          </Card>

          {/* Discussion Topics */}
          {!isConnected && (
            <Card className="border-slate-800/60">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#7C3AED]" />
                What You Can Discuss
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { icon: TrendingUp, label: 'Portfolio Performance', desc: 'Returns, volatility, and Sharpe ratio analysis', color: 'text-emerald-400' },
                  { icon: Shield, label: 'Risk Assessment', desc: 'Understand your risk exposure and warnings', color: 'text-amber-400' },
                  { icon: BarChart3, label: 'Holdings Deep-Dive', desc: 'Individual stock performance and allocation', color: 'text-[#00D4FF]' },
                  { icon: Activity, label: 'Stress Test Results', desc: 'How your portfolio holds up in crises', color: 'text-red-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                    <div className={`p-2 rounded-lg bg-slate-800/60 ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-slate-800/60">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-[#00D4FF]" />
              How It Works
            </h3>
            <ol className="space-y-4 text-sm">
              {[
                { step: '1', title: 'Click Start', desc: 'Allow microphone access when prompted.' },
                { step: '2', title: 'Talk Naturally', desc: 'Ask questions about any portfolio or holding.' },
                { step: '3', title: 'Get Insights', desc: 'AI advisor responds with personalized analysis.' },
                { step: '4', title: 'End When Done', desc: 'Click the End button to finish the session.' },
              ].map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Portfolio Context Preview */}
          <Card className="border-slate-800/60">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-400" />
              Your Context
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Portfolios</span>
                <span className="text-white font-semibold">{portfolios.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Ready for discussion</span>
                <span className="text-white font-semibold">{readyPortfolios.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total invested</span>
                <span className="text-white font-semibold">{fmtINR(totalCapital)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">AI assistant</span>
                <span className="text-emerald-400 font-semibold">Online</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}