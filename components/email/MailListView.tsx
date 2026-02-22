'use client'

import { cn } from '@/lib/utils'
import { Mail, Paperclip, Loader2 } from 'lucide-react'
import type { MailItem } from '@/app/email/actions'

interface MailListViewProps {
  mails: MailItem[]
  activeMailId: string | null
  onSelectMail: (mailId: string) => void
  folderName: string
  isLoading: boolean
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

  const m = date.getMonth() + 1
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  if (isToday) {
    return `${h}:${min}`
  }

  if (date.getFullYear() === now.getFullYear()) {
    return `${m}. ${d}. ${h}:${min}`
  }

  return `${date.getFullYear()}. ${m}. ${d}.`
}

function MailSkeleton() {
  return (
    <div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100">
          <div className="h-3 w-28 bg-slate-200 rounded animate-pulse shrink-0" />
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse shrink-0" />
          <div className="h-3 flex-1 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse shrink-0" />
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
}: MailListViewProps) {
  if (isLoading && mails.length === 0) {
    return <MailSkeleton />
  }

  if (mails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Mail className="h-10 w-10 mb-3" />
        <p className="text-sm">메일이 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 bg-blue-50/50 border-b border-slate-100">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          불러오는 중...
        </div>
      )}
      {mails.map((mail) => {
        const senderDisplay = mail.from?.name || mail.from?.emailAddress || '(발신자 없음)'
        const isActive = activeMailId === mail.mailId
        const unread = !mail.isRead

        return (
          <button
            key={mail.mailId}
            onClick={() => onSelectMail(mail.mailId)}
            className={cn(
              'w-full flex items-start md:items-center gap-2 px-4 py-3 md:py-2.5 border-b border-slate-100 text-left transition-colors',
              isActive ? 'bg-blue-50' : 'hover:bg-slate-50/80'
            )}
          >
            {/* Unread indicator */}
            <span className="w-2 shrink-0 flex justify-center pt-1 md:pt-0">
              {unread && <span className="h-2 w-2 rounded-full bg-blue-500" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="md:hidden min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'min-w-0 truncate text-sm',
                      unread ? 'font-semibold text-slate-900' : 'text-slate-600'
                    )}
                  >
                    {senderDisplay}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                    {formatMailDate(mail.receivedTime)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-200/60">
                    {folderName}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 truncate text-sm',
                      unread ? 'font-semibold text-slate-900' : 'text-slate-500'
                    )}
                  >
                    {mail.subject || '(제목 없음)'}
                  </span>
                  {mail.hasAttachment && (
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
              </div>

              <div className="hidden md:flex md:items-center md:gap-2 md:min-w-0">
                <span
                  className={cn(
                    'w-[160px] shrink-0 truncate text-sm',
                    unread ? 'font-semibold text-slate-900' : 'text-slate-600'
                  )}
                >
                  {senderDisplay}
                </span>

                <span className="hidden sm:inline-flex shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-200/60">
                  {folderName}
                </span>

                <span
                  className={cn(
                    'flex-1 min-w-0 truncate text-sm',
                    unread ? 'font-semibold text-slate-900' : 'text-slate-500'
                  )}
                >
                  {mail.subject || '(제목 없음)'}
                </span>

                {mail.hasAttachment && (
                  <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}

                <span className="w-[110px] shrink-0 text-right text-xs text-slate-400">
                  {formatMailDate(mail.receivedTime)}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
