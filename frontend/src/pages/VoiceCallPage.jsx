import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, ArrowLeft, User, AlertCircle,
  PhoneOff, MessageSquare, Volume2,
  Info, BarChart3, Wallet, Activity, Shield, TrendingUp,
  Mic, MicOff, Headphones,
} from 'lucide-react'
import { AtomsClient } from 'atoms-client-sdk'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

function fmtINR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

export default function VoiceCallPage() {
  const { isAuthenticated } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState('')
  const clientRef = useRef(null)
  const transcriptRef = useRef(null)

  const { data: portfolios = [] } = useQuery({
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

  useEffect(() => {
    return () => {
      clientRef.current?.stopSession?.()
      clientRef.current = null
    }
  }, [])

  const startConversation = async () => {
    if (portfolios.length === 0) {
      setError('Create at least one portfolio first before starting a voice session.')
      return
    }

    setError('')

    // Mint a short-lived Atoms web-call token from our backend
    let token, host
    try {
      const { data } = await api.post('/api/v1/voice/web-call', { mode: 'webcall' })
      token = data.token
      host = data.host
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Voice agent is not configured. Add SMALLEST_API_KEY and SMALLEST_AGENT_ID to the backend .env.')
      return
    }

    const client = new AtomsClient()
    clientRef.current = client

    client.on('session_started', () => setIsConnected(true))
    client.on('agent_start_talking', () => setIsSpeaking(true))
    client.on('agent_stop_talking', () => setIsSpeaking(false))

    client.on('transcript', (data) => {
      const text = data?.text?.trim()
      if (!text) return
      setTranscript(prev => [...prev, {
        role: data?.topic === 'user_response' ? 'user' : 'assistant',
        text,
        timestamp: new Date().toLocaleTimeString(),
      }])
    })

    client.on('session_ended', () => {
      setIsConnected(false)
      setIsSpeaking(false)
      setIsMuted(false)
      clientRef.current = null
    })

    const handleError = (e) => {
      setError(typeof e === 'string' ? e : e?.message || 'Voice assistant encountered an error. Please try again.')
    }
    client.on('error', handleError)
    client.on('microphone_permission_error', (d) => handleError(d?.error))
    client.on('microphone_access_failed', (d) => handleError(d?.error))

    try {
      setIsConnected(true)
      await client.startSession({ accessToken: token, mode: 'webcall', host })
      await client.startAudioPlayback()
    } catch (err) {
      setError(err?.message || 'Failed to start voice session. Check your microphone permissions and try again.')
      setIsConnected(false)
      clientRef.current = null
    }
  }

  const stopConversation = () => {
    if (clientRef.current) {
      clientRef.current.stopSession()
      clientRef.current = null
    }
    setIsConnected(false)
    setIsSpeaking(false)
    setIsMuted(false)
  }

  const toggleMute = () => {
    if (clientRef.current) {
      const next = !isMuted
      if (next) clientRef.current.mute()
      else clientRef.current.unmute()
      setIsMuted(next)
    }
  }

  return (
    <div className="space-y-6 py-6">
      <Link to="/dashboard" className="text-xs text-[#008080] hover:underline flex items-center gap-1 mb-1 font-medium">
        <ArrowLeft className="h-3 w-3" /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#0d2b2b] tracking-tight flex items-center gap-2">
            <Phone className="h-7 w-7 text-[#008080]" />
            Voice Portfolio Advisor
          </h1>
          <p className="text-sm text-[rgba(13,43,43,0.5)] mt-1">
            Talk to your AI advisor about your portfolios using your browser microphone.
          </p>
        </div>
        <Badge variant={isAuthenticated ? 'success' : 'gray'}>
          {isAuthenticated ? 'Authenticated' : 'Guest'}
        </Badge>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[rgba(0,128,128,0.1)] text-[#008080]">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Total Invested</p>
            <p className="text-xl font-black text-[#0d2b2b] font-mono">{fmtINR(totalCapital)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[rgba(0,128,128,0.1)] text-[#008080]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Portfolios</p>
            <p className="text-xl font-black text-[#0d2b2b] font-mono">{portfolios.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[rgba(154,110,58,0.1)] text-[#9a6e3a]">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[rgba(13,43,43,0.5)]">Ready for Discussion</p>
            <p className="text-xl font-black text-[#0d2b2b] font-mono">{readyPortfolios.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Voice Conversation Card */}
          <Card className={isConnected ? 'border-[#008080]/40 bg-[rgba(0,128,128,0.04)]' : ''}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0d2b2b] flex items-center gap-2">
                {isConnected ? (
                  <><Volume2 className="h-5 w-5 text-[#008080]" /> Voice Session Active</>
                ) : (
                  <><Mic className="h-5 w-5 text-[#008080]" /> Start a Conversation</>
                )}
              </h2>
              {isConnected && (
                <Badge variant="success">
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {isSpeaking ? 'Speaking' : 'Listening'}
                  </span>
                </Badge>
              )}
            </div>

            {/* Transcript area */}
            {isConnected && (
              <div className="h-64 overflow-y-auto mb-4 p-3 rounded-xl bg-[rgba(244,225,193,0.5)] border border-[rgba(0,128,128,0.15)] space-y-2 text-sm">
                {transcript.length === 0 ? (
                  <div className="text-center text-[rgba(13,43,43,0.4)] py-12">
                    <Headphones className="h-8 w-8 mx-auto mb-2 text-[rgba(13,43,43,0.3)]" />
                    <p className="italic text-xs">Say something to start the conversation…</p>
                  </div>
                ) : (
                  transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] text-[#0d2b2b]'
                          : 'bg-[rgba(244,225,193,0.8)] border border-[rgba(0,128,128,0.15)] text-[rgba(13,43,43,0.8)]'
                      }`}>
                        <span className={`text-[10px] font-bold block mb-0.5 ${
                          msg.role === 'user' ? 'text-[#008080]' : 'text-[#9a6e3a]'
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
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-amber-500/10 border-amber-500/40 text-[#78350f]'
                        : 'bg-[rgba(0,128,128,0.06)] border-[rgba(0,128,128,0.2)] text-[#008080] hover:border-[#008080]/40'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={stopConversation}
                    className="p-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-700 border-2 border-red-600/30 transition-all cursor-pointer"
                    title="End Session"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600 flex items-center gap-1 justify-center">
                <AlertCircle className="h-3 w-3" /> {error}
              </p>
            )}
          </Card>

          {/* Discussion Topics */}
          {!isConnected && (
            <Card>
              <h2 className="text-lg font-bold text-[#0d2b2b] mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#9a6e3a]" />
                What You Can Discuss
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { icon: TrendingUp, label: 'Portfolio Performance', desc: 'Returns, volatility, and Sharpe ratio analysis', color: 'text-[#008080]', bg: 'bg-[rgba(0,128,128,0.1)]' },
                  { icon: Shield, label: 'Risk Assessment', desc: 'Understand your risk exposure and warnings', color: 'text-[#78350f]', bg: 'bg-amber-500/10' },
                  { icon: BarChart3, label: 'Holdings Deep-Dive', desc: 'Individual stock performance and allocation', color: 'text-[#9a6e3a]', bg: 'bg-[rgba(154,110,58,0.1)]' },
                  { icon: Activity, label: 'Stress Test Results', desc: 'How your portfolio holds up in crises', color: 'text-red-600', bg: 'bg-red-500/10' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(244,225,193,0.5)] border border-[rgba(0,128,128,0.15)]">
                    <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0d2b2b]">{item.label}</p>
                      <p className="text-xs text-[rgba(13,43,43,0.5)] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-black text-[#0d2b2b] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-[#008080]" />
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
                  <span className="w-6 h-6 rounded-full bg-[rgba(0,128,128,0.1)] border border-[rgba(0,128,128,0.2)] text-[#008080] flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-semibold text-[#0d2b2b]">{s.title}</p>
                    <p className="text-xs text-[rgba(13,43,43,0.5)]">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Portfolio Context Preview */}
          <Card>
            <h3 className="text-sm font-black text-[#0d2b2b] uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#9a6e3a]" />
              Your Context
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[rgba(0,128,128,0.15)]">
                <span className="text-[rgba(13,43,43,0.5)]">Portfolios</span>
                <span className="text-[#0d2b2b] font-semibold">{portfolios.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[rgba(0,128,128,0.15)]">
                <span className="text-[rgba(13,43,43,0.5)]">Ready for discussion</span>
                <span className="text-[#0d2b2b] font-semibold">{readyPortfolios.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[rgba(0,128,128,0.15)]">
                <span className="text-[rgba(13,43,43,0.5)]">Total invested</span>
                <span className="text-[#0d2b2b] font-semibold">{fmtINR(totalCapital)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[rgba(13,43,43,0.5)]">AI assistant</span>
                <span className="text-emerald-700 font-semibold">Online</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
