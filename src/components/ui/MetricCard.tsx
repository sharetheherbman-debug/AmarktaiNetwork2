import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  icon?: ReactNode
  className?: string
  suffix?: string
}

export default function MetricCard({ label, value, change, icon, className, suffix }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className={cn('glass rounded-xl p-4 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <div className="text-blue-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            {value}
          </span>
          {suffix && <span className="text-sm text-slate-400 ml-1">{suffix}</span>}
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  )
}
