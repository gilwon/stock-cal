import { cn } from '@/lib/utils'

interface Props {
  signal: 'buy' | 'hold' | 'sell' | null | undefined
  className?: string
}

const CONFIG = {
  buy:  { label: '매수', className: 'bg-green-100 text-green-700 border-green-200' },
  hold: { label: '보유', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  sell: { label: '매도', className: 'bg-blue-100 text-blue-700 border-blue-200' },
} as const

export function SignalBadge({ signal, className }: Props) {
  if (!signal) return null
  const { label, className: colorClass } = CONFIG[signal]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
