import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  live:            { label: 'Live',            className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  ready_to_deploy: { label: 'Ready to Deploy', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  invite_only:     { label: 'Invite Only',     className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  in_development:  { label: 'In Development',  className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  coming_soon:     { label: 'Coming Soon',     className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  concept:         { label: 'Concept',         className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  offline:         { label: 'Offline',         className: 'bg-slate-600/15 text-slate-500 border-slate-600/30' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
