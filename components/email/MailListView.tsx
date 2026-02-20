'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail, Paperclip, Loader2 } from 'lucide-react'
import type { MailItem } from '@/app/email/actions'

interface MailListViewProps {
  mails: MailItem[]
  activeMailId: string | null
  onSelectMail: (mailId: string) => void
  folderName: string
  isLoading: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

function formatMailDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function MailSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="ml-auto h-3 w-12 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function MailListView({
  mails,
  activeMailId,
  onSelectMail,
  folderName,
  isLoading,
  onLoadMore,
  hasMore = false,
}: MailListViewProps) {
  return (
    <div className="flex flex-col h-full border-r border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">{folderName}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {isLoading ? '불러오는 중...' : `${mails.length}개의 메일`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && mails.length === 0 ? (
          <MailSkeleton />
        ) : mails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Mail className="h-10 w-10 mb-3" />
            <p className="text-sm">메일이 없습니다.</p>
          </div>
        ) : (
          <div>
            {mails.map((mail) => (
              <button
                key={mail.mailId}
                onClick={() => onSelectMail(mail.mailId)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-slate-50 transition-colors',
                  activeMailId === mail.mailId
                    ? 'bg-blue-50'
                    : 'hover:bg-slate-50',
                  !mail.isRead && 'bg-white'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {!mail.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm truncate flex-1',
                      !mail.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'
                    )}
                  >
                    {mail.from?.name || mail.from?.emailAddress || '(발신자 없음)'}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatMailDate(mail.receivedTime)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-sm truncate flex-1',
                      !mail.isRead ? 'text-slate-800' : 'text-slate-500'
                    )}
                  >
                    {mail.subject || '(제목 없음)'}
                  </span>
                  {mail.hasAttachment && (
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      불러오는 중...
                    </>
                  ) : (
                    '더 보기'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
