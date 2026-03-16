import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  glow?: 'blue' | 'cyan' | 'purple' | 'none'
}

export default function GlassPanel({ children, className, glow = 'none' }: GlassPanelProps) {
  const glowClass = {
    blue: 'glow-blue',
    cyan: 'glow-cyan',
    purple: 'glow-purple',
    none: '',
  }[glow]

  return (
    <div className={cn('glass rounded-2xl p-6', glowClass, className)}>
      {children}
    </div>
  )
}
