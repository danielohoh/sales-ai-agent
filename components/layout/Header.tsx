"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, PanelLeftOpen, PanelLeftClose, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { logout } from '@/app/auth/actions'

interface SearchClient {
  id: string
  company_name: string
  brand_name: string | null
  pipeline_stage: string | null
  industry: string | null
}

interface Notification {
  id: string
  type: 'reminder' | 'overdue' | 'schedule'
  title: string
  description: string
  link: string
  time: string | null
}

const STAGE_LABELS: Record<string, string> = {
  inquiry: '문의접수',
  called: '전화완료',
  email_sent: '메일전송',
  meeting: '미팅',
  meeting_followup: '미팅후속',
  reviewing: '검토',
  failed: '실패',
  on_hold: '보류',
  in_progress: '계약진행중',
  completed: '계약완료',
}

interface HeaderProps {
  title?: string
  userName?: string
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Header({
  title,
  userName,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter()
  const displayName = userName || ''
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchClient[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setIsLoading(false)
  }, [])

  const fetchClients = useCallback(async (value: string) => {
    const trimmed = value.trim()

    if (!trimmed) {
      setResults([])
      setIsLoading(false)
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/clients/search?q=${encodeURIComponent(trimmed)}`)
      if (!response.ok) {
        setResults([])
        return
      }

      const data: { clients?: SearchClient[] } = await response.json()
      setResults(data.clients ?? [])
      setIsOpen(true)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      void fetchClients(value)
    }, 300)
  }, [fetchClients])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    results.forEach((client) => {
      router.prefetch(`/clients/${client.id}`)
    })
  }, [results, router])

  const handleSearchChange = (value: string) => {
    setQuery(value)

    if (!value.trim()) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsOpen(true)
    debouncedSearch(value)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      clearSearch()
    }
  }

  const handleResultClick = () => {
    clearSearch()
  }

  const handleLogout = async () => {
    await logout()
  }

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data: { notifications?: Notification[]; count?: number } = await res.json()
        setNotifications(data.notifications ?? [])
        setNotifCount(data.count ?? 0)
      }
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 px-4 sm:px-6">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-xl text-slate-600 hover:bg-slate-100 md:inline-flex"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? '사이드바 열기' : '사이드바 접기'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          {title ? (
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
          ) : (
            <div ref={searchRef} className="relative hidden sm:block sm:w-[18rem] md:w-[24rem]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="고객사, 브랜드 검색..."
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-10"
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (query.trim()) {
                    setIsOpen(true)
                  }
                }}
              />

              {isOpen && query.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-500">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      검색 중...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-slate-500">검색 결과가 없습니다</div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto p-1.5">
                      {results.map((client) => (
                        <li key={client.id}>
                          <Link
                            href={`/clients/${client.id}`}
                            className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                            onClick={handleResultClick}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{client.company_name}</p>
                              <p className="truncate text-xs text-slate-500">{client.brand_name || '브랜드 미입력'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {client.pipeline_stage ? STAGE_LABELS[client.pipeline_stage] || client.pipeline_stage : '미분류'}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu onOpenChange={(open) => {
          if (open) {
            void fetchNotifications()
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-slate-200 p-1.5">
            <DropdownMenuLabel>알림 ({notifCount})</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500">새로운 알림이 없습니다</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <DropdownMenuItem key={`${notif.type}-${notif.id}`} asChild className="cursor-pointer">
                    <Link href={notif.link} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'reminder' && <Bell className="h-4 w-4 text-amber-500" />}
                        {notif.type === 'overdue' && <Clock className="h-4 w-4 text-red-500" />}
                        {notif.type === 'schedule' && <Calendar className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{notif.title}</p>
                        <p className="truncate text-xs text-slate-500">{notif.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 rounded-xl px-2 text-slate-700 hover:bg-slate-100 sm:gap-2 sm:px-3">
              <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                <AvatarFallback className="bg-slate-100 text-slate-700">
                  {displayName ? displayName.charAt(0) : <span className="inline-block h-3 w-3 animate-pulse rounded bg-slate-200" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {displayName || <span className="inline-block h-4 w-16 animate-pulse rounded bg-slate-200" />}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1.5">
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>프로필 설정</DropdownMenuItem>
            <DropdownMenuItem>알림 설정</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </header>
  )
}
