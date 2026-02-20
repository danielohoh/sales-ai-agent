'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Mail,
  Inbox,
  Send,
  UserCheck,
  FileEdit,
  StickyNote,
  Trash2,
  ShieldAlert,
  MailPlus,
  FolderOpen,
} from 'lucide-react'
import { getMailFolders, type MailFolder } from '@/app/email/actions'

const FOLDER_ITEMS = [
  { type: 'all', label: '전체메일', icon: Mail, href: '/email' },
  { type: 'inbox', label: '받은메일함', icon: Inbox, href: '/email?folder=inbox' },
  { type: 'sent', label: '보낸메일함', icon: Send, href: '/email?folder=sent' },
  { type: 'receipt', label: '수신확인', icon: UserCheck, href: '/email?folder=receipt' },
  { type: 'draft', label: '임시보관함', icon: FileEdit, href: '/email?folder=draft' },
  { type: 'trash', label: '휴지통', icon: Trash2, href: '/email?folder=trash' },
  { type: 'spam', label: '스팸메일함', icon: ShieldAlert, href: '/email?folder=spam' },
  { type: 'memo', label: '메모함', icon: StickyNote, href: '/email?folder=memo' },
]

function matchFolderToType(folderName: string): string | null {
  const name = folderName.toLowerCase()
  if (name === 'inbox' || name.includes('받은')) return 'inbox'
  if ((name === 'sent' || name === 'sentbox' || name.includes('보낸')) && !name.includes('2')) return 'sent'
  if (name === 'draft' || name === 'drafts' || name.includes('임시')) return 'draft'
  if (name.includes('수신')) return 'receipt'
  if (name.includes('메모')) return 'memo'
  if (name === 'trash' || name.includes('휴지')) return 'trash'
  if (name === 'junk' || name === 'spam' || name.includes('스팸')) return 'spam'
  return null
}

function EmailFolderNavInner() {
  const [folders, setFolders] = useState<MailFolder[]>([])
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const currentFolder = searchParams.get('folder') || (pathname === '/email' ? 'all' : null)

  useEffect(() => {
    getMailFolders().then(result => {
      if (result.data) setFolders(result.data)
    })
  }, [])

  const getUnreadCount = (type: string): number => {
    if (type === 'all') {
      return folders.reduce((sum, f) => sum + (f.unreadMailCount || 0), 0)
    }
    const folder = folders.find(f => matchFolderToType(f.folderName) === type)
    return folder?.unreadMailCount || 0
  }

  const userFolders = folders.filter(f => !matchFolderToType(f.folderName) && f.folderType === 'U')

  return (
    <>
      {FOLDER_ITEMS.map(({ type, label, icon: Icon, href }) => {
        const isActive = currentFolder === type
        const unread = getUnreadCount(type)

        return (
          <Link
            key={type}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {unread > 0 && (
              <span className="text-xs text-blue-600 font-medium">
                {unread > 999 ? '999+' : unread}
              </span>
            )}
          </Link>
        )
      })}

      {userFolders.map(folder => (
        <Link
          key={folder.folderId}
          href={`/email?folder=${encodeURIComponent(folder.folderId)}`}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="flex-1 truncate">{folder.folderName}</span>
          {folder.unreadMailCount > 0 && (
            <span className="text-xs text-blue-600 font-medium">
              {folder.unreadMailCount}
            </span>
          )}
        </Link>
      ))}

      <div className="my-1.5 border-t border-slate-100" />

      <Link
        href="/email/compose"
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
          pathname === '/email/compose'
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <MailPlus className="h-4 w-4" />
        <span>메일 작성</span>
      </Link>
    </>
  )
}

export function EmailFolderNav() {
  return (
    <Suspense fallback={
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 bg-slate-100 rounded animate-pulse mx-1" />
        ))}
      </div>
    }>
      <EmailFolderNavInner />
    </Suspense>
  )
}
