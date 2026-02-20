"use client"

import { Bell, Search, LogOut, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
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

interface HeaderProps {
  title?: string
  userName?: string
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Header({
  title,
  userName = '사용자',
  isSidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 px-4 sm:px-6">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-slate-600 hover:bg-slate-100"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? '사이드바 열기' : '사이드바 접기'}
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
        {title ? (
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        ) : (
          <div className="relative hidden sm:block sm:w-[18rem] md:w-[24rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="고객사, 담당자 검색..."
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-10"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-slate-200 p-1.5">
            <DropdownMenuLabel>알림</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="font-medium text-sm">🔴 3일 미연락 고객</p>
              <p className="text-xs text-slate-500">ABC프랜차이즈 - 김철수</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="font-medium text-sm">🟡 7일 무응답</p>
              <p className="text-xs text-slate-500">델리버리코리아 - 박민수</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="font-medium text-sm">📅 내일 미팅 예정</p>
              <p className="text-xs text-slate-500">푸드테크 - 최지현</p>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-sm text-blue-600 cursor-pointer">
              모든 알림 보기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 rounded-xl px-2 text-slate-700 hover:bg-slate-100 sm:gap-2 sm:px-3">
              <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                <AvatarFallback className="bg-slate-100 text-slate-700">
                  {userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{userName}</span>
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
