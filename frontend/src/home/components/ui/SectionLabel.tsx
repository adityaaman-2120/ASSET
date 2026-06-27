interface SectionLabelProps {
  label: string
  color?: 'teal' | 'sand' | 'cream'
}

export function SectionLabel({ label, color = 'teal' }: SectionLabelProps) {
  const clr =
    color === 'teal'  ? 'bg-[#008080] text-[#008080]' :
    color === 'sand'  ? 'bg-[#9a6e3a] text-[#9a6e3a]' :
                        'bg-[#F4E1C1] text-[#F4E1C1]'
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-5 h-px ${clr.split(' ')[0]}`} />
      <span className={`font-mono text-[10px] tracking-[0.22em] uppercase ${clr.split(' ')[1]}`}>
        {label}
      </span>
    </div>
  )
}
