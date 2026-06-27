import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorStore } from '../store/investorStore'

function Skeleton() {
  return (
    <div className="w-full max-w-lg mx-auto animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-gray-200 rounded-full" />
        <div className="h-8 w-28 bg-gray-200 rounded-full" />
        <div className="h-8 w-24 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )
}

function ProfileCard({ summary, formData, onContinue }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#2a78d6] flex items-center justify-center text-white font-semibold text-xl shrink-0">
          You
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">Your Investor Profile</p>
          <p className="text-sm text-gray-500">{summary?.styleLabel || formData?.investorType}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Tag label="Capital" value={summary?.displayCapital || formData?.capital} />
        <Tag label="Risk Level" value={summary?.riskLabel || formData?.risk} />
        <Tag label="Time Horizon" value={summary?.horizonLabel || formData?.horizon} />
        <Tag label="Investment Style" value={summary?.styleLabel || formData?.investorType} />
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Sectors
        </p>
        <div className="flex flex-wrap gap-2">
          {(summary?.sectorsList || formData?.sectors || []).map((s) => (
            <span
              key={s}
              className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-[#2a78d6]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-gray-200 mb-6" />

      {summary?.summaryParagraph && (
        <p className="text-sm text-gray-600 leading-relaxed italic mb-6">
          {summary.summaryParagraph}
        </p>
      )}

      <button
        onClick={onContinue}
        className="w-full py-3 px-6 text-sm font-semibold rounded-xl bg-[#2a78d6] text-white hover:bg-blue-700 transition-colors"
      >
        See My Strategy →
      </button>
    </div>
  )
}

function Tag({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  )
}

function RawFallback({ formData, onContinue }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Your Investor Profile
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Tag label="Capital" value={formData.capital} />
        <Tag label="Risk Level" value={formData.risk} />
        <Tag label="Time Horizon" value={formData.horizon} />
        <Tag label="Investment Style" value={formData.investorType} />
      </div>
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Sectors
        </p>
        <div className="flex flex-wrap gap-2">
          {(formData.sectors || []).map((s) => (
            <span
              key={s}
              className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-[#2a78d6]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      {formData.goal && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Your Goal
          </p>
          <p className="text-sm text-gray-700 italic">{formData.goal}</p>
        </div>
      )}
      <hr className="border-gray-200 mb-6" />
      <button
        onClick={onContinue}
        className="w-full py-3 px-6 text-sm font-semibold rounded-xl bg-[#2a78d6] text-white hover:bg-blue-700 transition-colors"
      >
        See My Strategy →
      </button>
    </div>
  )
}

export default function ProfileSummary() {
  const navigate = useNavigate()
  const profile = useInvestorStore((s) => s.profile)
  const setProfile = useInvestorStore((s) => s.setProfile)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile) {
      navigate('/')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_XAI_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-2',
            max_tokens: 400,
            messages: [
              {
                role: 'system',
                content:
                  'You are a financial profile summarizer. Given structured investor form data, return ONLY a valid JSON object with no markdown, no backticks, no extra text. The JSON must have exactly these keys: displayCapital (string), riskLabel (string like \'Medium Risk\'), horizonLabel (string), sectorsList (array of strings), styleLabel (string), summaryParagraph (2 warm reassuring sentences about this investor\'s approach).',
              },
              {
                role: 'user',
                content: `Investor form data: ${JSON.stringify(profile)}. Generate the profile JSON now.`,
              },
            ],
          }),
        })

        if (!res.ok) {
          const body = await res.text()
          throw new Error(`API ${res.status}: ${body}`)
        }

        const data = await res.json()
        let raw = data.choices?.[0]?.message?.content || ''
        raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(raw)

        if (!cancelled) {
          setSummary(parsed)
          setProfile({ ...profile, summary: parsed })
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Profile Summary</h1>
        <p className="text-sm text-gray-500 mb-6">
          Here's what we understand about you
        </p>

        {loading ? (
          <Skeleton />
        ) : error ? (
          <div>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200 mb-4">
              We couldn't generate your summary. Here's what we captured:
            </p>
            <RawFallback
              formData={profile}
              onContinue={() => navigate('/dashboard')}
            />
          </div>
        ) : (
          <ProfileCard
            summary={summary}
            formData={profile}
            onContinue={() => navigate('/dashboard')}
          />
        )}
      </div>
    </div>
  )
}
