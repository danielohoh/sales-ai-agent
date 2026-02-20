'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Calendar, Sparkles, MoreHorizontal } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/clients', label: '고객', icon: Users },
  { href: '/schedules', label: '일정', icon: Calendar },
  { href: '/ai-assistant', label: 'AI비서', icon: Sparkles },
  { href: '/more', label: '더보기', icon: MoreHorizontal },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/more') {
      return ['/email', '/proposals', '/analytics', '/tasks', '/settings'].some((p) => pathname.startsWith(p))
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href === '/more' ? '/email' : tab.href}
              className={cn(
                'flex min-w-[64px] flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                active ? 'text-blue-600' : 'text-slate-400'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn('text-[11px]', active && 'font-semibold')}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
