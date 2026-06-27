interface DividerProps { className?: string }
export function Divider({ className = '' }: DividerProps) {
  return <div className={`swiss-line w-full ${className}`} />
}
