import { User, CheckCircle2 } from 'lucide-react'
import { Container } from '../ui/Container'
import { SectionLabel } from '../ui/SectionLabel'

const questions = [
  {
    section: 'A — Capital & Risk', color: '#008080',
    q: 'How much loss can you handle?',
    options: ['Cannot afford to lose anything (Very Low Risk)', 'Can handle 10-15% loss (Low Risk)', 'Can handle up to 25% loss (Medium Risk)', 'Okay with high risk for high reward (High Risk)'],
    sel: 2,
  },
  {
    section: 'B — Time Horizon', color: '#9a6e3a',
    q: 'When do you need this money back?',
    options: ['Within 3 months', '3 – 12 months', '1 – 3 years', '3+ years (Wealth Building)'],
    sel: 1,
  },
  {
    section: 'D — Investment Style', color: '#008080',
    q: 'What kind of investor are you?',
    options: ['Safety First', 'Balanced — Mix of safe and growth stocks', 'Growth Seeker', 'Trader Mindset'],
    sel: 1,
  },
]

const sectors = [
  { label: 'Technology', sel: true }, { label: 'Banking & Finance', sel: true },
  { label: 'Pharmaceuticals', sel: true }, { label: 'Energy & Oil', sel: false },
  { label: 'FMCG & Consumer', sel: false }, { label: 'EV & Green Energy', sel: false },
  { label: 'Infrastructure', sel: false }, { label: 'Defence & PSUs', sel: false },
]

export function InvestorProfile() {
  return (
    <section className="py-20 relative overflow-hidden bg-[#ecdcc0]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(0,128,128,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, rgba(154,110,58,0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <Container>
        <div className="max-w-xl mb-12 animate-fade-up">
          <SectionLabel label="Onboarding" />
          <h2 className="font-['Syne'] font-extrabold text-3xl md:text-4xl text-[#0d2b2b] leading-tight mb-3">
            Not a form.<span className="grad-teal"> A conversation.</span>
          </h2>
          <p className="text-[#0d2b2b]/50 text-base">
            Structured inputs that feel human. Your answers + a plain-English goal = hyper-personalised portfolio.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Form mockup */}
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.section} className="rounded-2xl p-5 border transition-all duration-300" style={{ background: `${q.color}06`, borderColor: `${q.color}15` }}>
                <div className="font-mono text-[8px] tracking-[0.2em] uppercase mb-2.5" style={{ color: `${q.color}80` }}>Section {q.section}</div>
                <p className="font-['Syne'] font-semibold text-sm text-[#0d2b2b]/80 mb-3">{q.q}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200"
                      style={{ background: i === q.sel ? `${q.color}10` : 'rgba(13,43,43,0.03)', border: `1px solid ${i === q.sel ? q.color + '28' : 'rgba(13,43,43,0.06)'}`, color: i === q.sel ? '#0d2b2b' : 'rgba(13,43,43,0.40)' }}>
                      <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: i === q.sel ? q.color : 'rgba(13,43,43,0.2)', background: i === q.sel ? q.color : 'transparent' }}>
                        {i === q.sel && <div className="w-1 h-1 rounded-full bg-[#F4E1C1]" />}
                      </div>
                      <span className="text-xs">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Sector */}
            <div className="rounded-2xl p-5 border border-[rgba(154,110,58,0.15)] bg-[rgba(154,110,58,0.05)]">
              <div className="font-mono text-[8px] tracking-widest uppercase text-[#9a6e3a]/70 mb-2.5">Section C — Sector Interest</div>
              <p className="font-['Syne'] font-semibold text-sm text-[#0d2b2b]/80 mb-3">Which sectors interest you?</p>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((s) => (
                  <div key={s.label} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs cursor-pointer transition-all duration-200"
                    style={{ background: s.sel ? 'rgba(0,128,128,0.1)' : 'rgba(13,43,43,0.04)', border: `1px solid ${s.sel ? 'rgba(0,128,128,0.3)' : 'rgba(13,43,43,0.07)'}`, color: s.sel ? '#008080' : 'rgba(13,43,43,0.40)' }}>
                    {s.sel && <CheckCircle2 size={9} />}
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profile card */}
          <div className="sticky top-24">
            <div className="relative rounded-3xl overflow-hidden clay-cream p-7">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(0,128,128,0.12)_0%,transparent_70%)]" />

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#008080] flex items-center justify-center shadow-[0_2px_12px_rgba(0,128,128,0.3)]">
                  <User size={17} className="text-[#F4E1C1]" />
                </div>
                <div>
                  <div className="font-['Syne'] font-bold text-[#0d2b2b]">Your Investor Profile</div>
                  <div className="font-mono text-[8px] text-[#0d2b2b]/30 tracking-widest uppercase">Generated in 90s</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[
                  { label: 'Capital', value: '₹75,000', color: '#9a6e3a' },
                  { label: 'Risk Level', value: 'Medium 🟡', color: '#008080' },
                  { label: 'Horizon', value: '6-12 months', color: '#9a6e3a' },
                  { label: 'Style', value: 'Balanced Growth', color: '#008080' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: `${s.color}0a`, border: `1px solid ${s.color}18` }}>
                    <div className="font-mono text-[7px] tracking-widest uppercase mb-1" style={{ color: `${s.color}66` }}>{s.label}</div>
                    <div className="font-['Syne'] font-semibold text-sm text-[#0d2b2b]">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <div className="font-mono text-[8px] tracking-widest uppercase text-[#0d2b2b]/30 mb-2">Sectors</div>
                <div className="flex gap-1.5 flex-wrap">
                  {['Tech', 'Pharma', 'Banking'].map(s => <span key={s} className="tag">{s}</span>)}
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-[rgba(13,43,43,0.05)] border border-[rgba(0,128,128,0.1)] mb-5">
                <div className="font-mono text-[8px] tracking-widest uppercase text-[#0d2b2b]/25 mb-1.5">AI Summary</div>
                <p className="text-sm text-[#0d2b2b]/55 leading-relaxed italic">
                  "You're a balanced investor looking for steady growth over the next year. We'll focus on fundamentally strong companies in your preferred sectors."
                </p>
              </div>

              <button className="w-full py-3 rounded-2xl font-semibold text-sm text-[#F4E1C1] bg-[#008080] hover:bg-[#006666] transition-all duration-200 shadow-[0_4px_16px_rgba(0,128,128,0.3)]">
                Build My Portfolio →
              </button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
