import { Container } from '../ui/Container'

export function Footer() {
  return (
    <footer className="py-10 border-t border-[rgba(0,128,128,0.1)] bg-[#F4E1C1]">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#008080]">
              <span className="font-['Syne'] font-extrabold text-[#F4E1C1] text-sm">A</span>
            </div>
            <div>
              <div className="font-['Syne'] font-extrabold text-sm tracking-[0.06em] text-[#0d2b2b]">ASSETS</div>
              <div className="font-mono text-[7px] tracking-widest text-[#008080]/45 uppercase">AI Portfolio Engine</div>
            </div>
          </div>

          {/* links */}
          <div className="flex items-center gap-6">
            {['Features', 'How It Works', 'Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" className="text-sm text-[#0d2b2b]/40 hover:text-[#008080] transition-colors duration-200">{l}</a>
            ))}
          </div>

          {/* right */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#008080] ripple" />
              <span className="font-mono text-[9px] text-[#0d2b2b]/30">All systems live</span>
            </div>
            <div className="w-px h-3 bg-[rgba(0,128,128,0.15)]" />
            <span className="font-mono text-[9px] text-[#0d2b2b]/25">© 2026 ASSETS</span>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] text-[#0d2b2b]/20 leading-relaxed">
          Not SEBI registered. For educational &amp; research purposes only. Not financial advice.
        </p>
      </Container>
    </footer>
  )
}
