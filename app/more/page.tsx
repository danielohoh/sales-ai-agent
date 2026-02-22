'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { Mail, ListTodo, FileText, BarChart3, Columns3, Settings, LogOut } from 'lucide-react'
import { logout } from '@/app/auth/actions'
import { useUser } from '@/lib/hooks/useUser'

const menuItems = [
  { href: '/email', label: '이메일', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  { href: '/tasks', label: '할일', icon: ListTodo, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { href: '/proposals', label: '제안서', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
  { href: '/analytics', label: '분석', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
  { href: '/clients/kanban', label: '칸반 보드', icon: Columns3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { href: '/settings', label: '설정', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' },
]

export default function MorePage() {
  const { user } = useUser()
  const displayName = user?.name || '사용자'
  const displayEmail = user?.email || ''

  const handleLogout = async () => {
    await logout()
  }

  return (
    <MainLayout title="더보기">
      <div className="pb-24">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-5 transition-all active:scale-[0.97] hover:shadow-sm"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg}`}>
                  <Icon className={`h-5.5 w-5.5 ${item.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">{displayName.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{displayEmail}</p>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
