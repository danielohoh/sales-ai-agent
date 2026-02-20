'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  ShieldAlert,
  Mail,
  FolderOpen,
  RefreshCw,
  MailPlus,
} from 'lucide-react'
import type { MailFolder } from '@/app/email/actions'

interface MailFolderSidebarProps {
  folders: MailFolder[]
  activeFolderId: string | null
  onSelectFolder: (folderId: string, folderName: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

function getFolderIcon(folderName: string) {
  const name = folderName.toLowerCase()
  if (name === 'inbox' || name.includes('받은')) return Inbox
  if (name === 'sent' || name.includes('보낸')) return Send
  if (name === 'draft' || name.includes('임시')) return FileEdit
  if (name === 'trash' || name.includes('휴지')) return Trash2
  if (name === 'junk' || name.includes('스팸')) return ShieldAlert
  return FolderOpen
}

function getFolderDisplayName(folderName: string) {
  const name = folderName.toLowerCase()
  if (name === 'inbox') return '받은메일함'
  if (name === 'sent' || name === 'sentbox') return '보낸메일함'
  if (name === 'draft' || name === 'drafts') return '임시보관함'
  if (name === 'trash') return '휴지통'
  if (name === 'junk' || name === 'spam') return '스팸메일함'
  return folderName
}

export function MailFolderSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  onRefresh,
  isRefreshing = false,
}: MailFolderSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">메일함</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="px-3 py-2">
        <a href="/email/compose">
          <Button className="w-full" size="sm">
            <MailPlus className="h-4 w-4 mr-2" />
            메일 작성
          </Button>
        </a>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1 space-y-0.5">
          <button
            onClick={() => onSelectFolder('', '전체메일')}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              activeFolderId === ''
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">전체메일</span>
          </button>

          {folders.map((folder) => {
            const Icon = getFolderIcon(folder.folderName)
            const displayName = getFolderDisplayName(folder.folderName)
            const isActive = activeFolderId === folder.folderId

            return (
              <button
                key={folder.folderId}
                onClick={() => onSelectFolder(folder.folderId, displayName)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{displayName}</span>
                {folder.unreadMailCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs px-1.5 py-0 min-w-[20px] justify-center"
                  >
                    {folder.unreadMailCount}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
