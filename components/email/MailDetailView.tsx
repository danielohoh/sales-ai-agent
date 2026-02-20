'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Paperclip, User, Clock, Reply, ReplyAll, Forward, Trash2 } from 'lucide-react'
import type { MailItem } from '@/app/email/actions'

interface MailDetailViewProps {
  mail: MailItem | null
  isLoading: boolean
  onDelete?: (mailId: string) => void
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일 ${h}:${min}`
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="h-px bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${80 - i * 8}%` }} />
        ))}
      </div>
    </div>
  )
}

function formatAddressList(addresses: { name: string; emailAddress: string }[]) {
  return addresses
    .map((a) => (a.name ? `${a.name} <${a.emailAddress}>` : a.emailAddress))
    .join(', ')
}

export function MailDetailView({ mail, isLoading, onDelete }: MailDetailViewProps) {
  const router = useRouter()

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!mail) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Mail className="h-12 w-12 mb-3" />
        <p className="text-sm">메일을 선택해주세요</p>
      </div>
    )
  }

  const isHtml = mail.body?.contentType?.toLowerCase().includes('html')

  const replySubject = mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject || ''}`
  const fwdSubject = mail.subject?.startsWith('Fwd:') ? mail.subject : `Fwd: ${mail.subject || ''}`
  const replyTo = mail.from?.emailAddress || ''

  const handleReply = () => {
    const params = new URLSearchParams({ to: replyTo, subject: replySubject })
    router.push(`/email/compose?${params.toString()}`)
  }

  const handleReplyAll = () => {
    const allTo = [
      replyTo,
      ...(mail.to || []).map(a => a.emailAddress).filter(e => e !== replyTo),
    ].join(',')
    const cc = (mail.cc || []).map(a => a.emailAddress).join(',')
    const params = new URLSearchParams({ to: allTo, subject: replySubject })
    if (cc) params.set('cc', cc)
    router.push(`/email/compose?${params.toString()}`)
  }

  const handleForward = () => {
    const params = new URLSearchParams({ subject: fwdSubject })
    router.push(`/email/compose?${params.toString()}`)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 space-y-4 overflow-auto flex-1">
        <h1 className="text-xl font-semibold text-slate-900">
          {mail.subject || '(제목 없음)'}
        </h1>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-500">보낸사람 </span>
              <span className="text-slate-800 font-medium">
                {mail.from?.name || mail.from?.emailAddress || '(알 수 없음)'}
              </span>
              {mail.from?.emailAddress && (
                <span className="text-slate-400 ml-1">&lt;{mail.from.emailAddress}&gt;</span>
              )}
            </div>
          </div>

          {mail.to && mail.to.length > 0 && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">받는사람 </span>
                <span className="text-slate-700">{formatAddressList(mail.to)}</span>
              </div>
            </div>
          )}

          {mail.cc && mail.cc.length > 0 && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">참조 </span>
                <span className="text-slate-700">{formatAddressList(mail.cc)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-500">{formatFullDate(mail.receivedTime)}</span>
          </div>

          {mail.hasAttachment && (
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
              <Badge variant="outline" className="text-xs">첨부파일</Badge>
            </div>
          )}
        </div>

        <Separator />

        <div className="min-h-0">
          {mail.body?.content ? (
            isHtml ? (
              <div
                className="text-sm text-slate-800 leading-relaxed [&_img]:max-w-full [&_table]:w-full [&_a]:text-blue-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: mail.body.content }}
              />
            ) : (
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {mail.body.content}
              </pre>
            )
          ) : (
            <p className="text-sm text-slate-400 italic">메일 본문이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReply}>
            <Reply className="h-4 w-4 mr-1.5" />
            답장
          </Button>
          <Button variant="outline" size="sm" onClick={handleReplyAll}>
            <ReplyAll className="h-4 w-4 mr-1.5" />
            전체답장
          </Button>
          <Button variant="outline" size="sm" onClick={handleForward}>
            <Forward className="h-4 w-4 mr-1.5" />
            전달
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:border-red-300"
            onClick={() => onDelete?.(mail.mailId)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            삭제
          </Button>
        </div>
      </div>
    </div>
  )
}
