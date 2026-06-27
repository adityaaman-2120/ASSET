const items = [
  { t: 'RELIANCE', v: '+1.8%', up: true },
  { t: 'TCS', v: '+0.9%', up: true },
  { t: 'HDFC BANK', v: '+2.1%', up: true },
  { t: 'INFOSYS', v: '−0.4%', up: false },
  { t: 'SUN PHARMA', v: '+3.2%', up: true },
  { t: 'ITC', v: '+0.7%', up: true },
  { t: 'ONGC', v: '+1.1%', up: true },
  { t: 'WIPRO', v: '−0.2%', up: false },
  { t: 'ICICI BANK', v: '+1.4%', up: true },
  { t: 'BAJAJ FIN', v: '+2.8%', up: true },
  { t: 'NESTLÉ', v: '+0.5%', up: true },
  { t: 'HUL', v: '+1.0%', up: true },
]

const doubled = [...items, ...items]

export function MarqueeBar() {
  return (
    <div className="relative overflow-hidden border-y border-[rgba(0,128,128,0.12)] bg-[rgba(0,128,128,0.04)] py-3">
      <div className="flex gap-10 animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-[10px] tracking-widest text-[#0d2b2b]/40 uppercase">{item.t}</span>
            <span className={`font-mono text-[10px] font-bold ${item.up ? 'text-[#008080]' : 'text-red-500'}`}>{item.v}</span>
            <span className="text-[#0d2b2b]/10 ml-4">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
