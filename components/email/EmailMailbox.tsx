'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
  getMailList,
  getMailDetail,
  deleteMail,
  type MailItem,
} from '@/app/email/actions'
import { MailListView } from './MailListView'
import { MailDetailView } from './MailDetailView'

interface EmailMailboxProps {
  folderType: string
  folderId: string
  folderName: string
  initialMails: MailItem[]
  initialCursor?: string
  initialError?: string | null
}

export function EmailMailbox({
  folderType,
  folderId,
  folderName,
  initialMails,
  initialCursor,
  initialError,
}: EmailMailboxProps) {
  const [mails, setMails] = useState<MailItem[]>(initialMails)
  const [activeMailId, setActiveMailId] = useState<string | null>(null)
  const [currentMail, setCurrentMail] = useState<MailItem | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [hasMore, setHasMore] = useState(!!initialCursor)

  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)

  const [showDetail, setShowDetail] = useState(false)

  const handleSelectMail = useCallback(async (mailId: string) => {
    setActiveMailId(mailId)
    setShowDetail(true)
    setIsDetailLoading(true)
    setError(null)

    const result = await getMailDetail(mailId)
    if (result.data) {
      setCurrentMail(result.data)
    } else if (result.error) {
      setError(result.error)
    }
    setIsDetailLoading(false)
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (!folderId || !cursor) return
    setIsListLoading(true)

    const result = await getMailList(folderId, { cursor, count: 30 })
    if (result.data) {
      setMails(prev => [...prev, ...result.data!.mails])
      setCursor(result.data.responseMetaData?.nextCursor)
      setHasMore(!!result.data.responseMetaData?.nextCursor)
    }
    setIsListLoading(false)
  }, [folderId, cursor])

  const handleDelete = useCallback(async (mailId: string) => {
    if (!confirm('이 메일을 삭제하시겠습니까?')) return

    const result = await deleteMail(mailId)
    if (result.error) {
      setError(result.error)
      return
    }

    setMails(prev => prev.filter(m => m.mailId !== mailId))
    if (activeMailId === mailId) {
      setActiveMailId(null)
      setCurrentMail(null)
      setShowDetail(false)
    }
  }, [activeMailId])

  const handleBackToList = useCallback(() => {
    setShowDetail(false)
  }, [])

  return (
    <div className="h-[calc(100vh-180px)]">
      {error && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="hidden md:grid md:grid-cols-[380px_1fr] h-full border border-slate-200 rounded-xl overflow-hidden">
        <MailListView
          mails={mails}
          activeMailId={activeMailId}
          onSelectMail={handleSelectMail}
          folderName={folderName}
          isLoading={isListLoading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
        <MailDetailView
          mail={currentMail}
          isLoading={isDetailLoading}
          onDelete={handleDelete}
        />
      </div>

      <div className="md:hidden h-full border border-slate-200 rounded-xl overflow-hidden">
        {!showDetail ? (
          <MailListView
            mails={mails}
            activeMailId={activeMailId}
            onSelectMail={handleSelectMail}
            folderName={folderName}
            isLoading={isListLoading}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-slate-100 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="text-slate-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                메일 목록
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MailDetailView
                mail={currentMail}
                isLoading={isDetailLoading}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
