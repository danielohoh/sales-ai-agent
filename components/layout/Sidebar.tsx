'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  Building2,
  Sparkles,
  Calendar,
  ListTodo,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { 
    href: '/dashboard', 
    label: '대시보드', 
    icon: LayoutDashboard 
  },
  { 
    href: '/ai-assistant', 
    label: 'AI 영업 비서', 
    icon: Sparkles 
  },
  { 
    href: '/schedules', 
    label: '일정 관리', 
    icon: Calendar 
  },
  {
    href: '/tasks',
    label: '할일',
    icon: ListTodo,
  },
  { 
    href: '/clients', 
    label: '고객관리', 
    icon: Users,
    children: [
      { href: '/clients', label: '전체 목록' },
      { href: '/clients/kanban', label: '칸반 보드' },
    ]
  },
  { 
    href: '/email', 
    label: '이메일', 
    icon: Mail,
    children: [
      { href: '/email/compose', label: '발송' },
      { href: '/email/templates', label: '템플릿' },
    ]
  },
  { href: '/proposals', label: '제안서', icon: FileText },
  { 
    href: '/analytics', 
    label: '분석', 
    icon: BarChart3,
    children: [
      { href: '/analytics/failure', label: '실패 분석' },
      { href: '/analytics/reports', label: '리포트' },
    ]
  },
  { href: '/settings', label: '설정', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onNavClick?: () => void
}

export function Sidebar({ collapsed = false, onToggle, onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>([])

  const toggleMenu = (href: string) => {
    setOpenMenus(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    )
  }

  const isActive = (href: string) => {
    if (href === '/clients' && pathname === '/clients') return true
    if (href === '/clients/kanban' && pathname === '/clients/kanban') return true
    return pathname.startsWith(href) && href !== '/clients'
  }

  return (
    <aside className={cn(
      'min-h-screen border-r border-slate-200 bg-white py-5 text-slate-700 transition-[width,padding] duration-200',
      collapsed ? 'w-20 px-3' : 'w-72 px-4'
    )}>
      <div className={cn('mb-6 flex items-center gap-2 py-3', collapsed ? 'justify-center px-0' : 'justify-between px-2')}>
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        {!collapsed && (
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">MSBENTER</h1>
          <p className="text-xs text-slate-500">영업 에이전트</p>
        </div>
        )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-xl text-slate-500 hover:bg-slate-100', collapsed && 'hidden')}
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 열기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isOpen = openMenus.includes(item.href)
          const active = isActive(item.href)

          return (
            <div key={item.href}>
              {hasChildren ? (
                <>
                  {collapsed ? (
                    <Link
                      href={item.href}
                      onClick={onNavClick}
                      className={cn(
                        'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown 
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isOpen && 'rotate-180'
                        )} 
                      />
                    </button>
                  )}
                  {isOpen && !collapsed && (
                    <div className="ml-8 mt-1.5 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavClick}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center' : 'gap-3',
                    active 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200">
            <span className="text-sm font-semibold text-slate-700">김</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">김영업</p>
            <p className="truncate text-xs text-slate-500">sales@msbenter.com</p>
          </div>
        </div>
      </div>
      )}

      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="mt-4 w-full rounded-xl text-slate-500 hover:bg-slate-100"
          onClick={onToggle}
          aria-label="사이드바 열기"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </aside>
  )
}
