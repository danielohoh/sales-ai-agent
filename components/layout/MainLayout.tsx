"use client"

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { useUser } from '@/lib/hooks/useUser'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { user, loading: userLoading } = useUser()

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <div className="hidden md:block">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          userName={userLoading ? '' : (user?.name ?? '')}
          userEmail={userLoading ? '' : (user?.email ?? '')}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          userName={userLoading ? '' : (user?.name ?? '')}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
