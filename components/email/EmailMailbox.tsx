'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MailPlus, ChevronLeft, ChevronRight, X, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMailList,
  getMailDetail,
  deleteMail,
  type MailItem,
} from '@/app/email/actions'
import { MailListView } from './MailListView'
import { MailDetailView } from './MailDetailView'
import { EmailFolderNav } from './EmailFolderNav'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const PAGE_SIZE = 20

interface EmailMailboxProps {
  folderId: string
  folderName: string
  initialMails: MailItem[]
  initialCursor?: string
  initialError?: string | null
}

export function EmailMailbox({
  folderId,
  folderName,
  initialMails,
  initialCursor,
  initialError,
}: EmailMailboxProps) {
  const [allMails, setAllMails] = useState<MailItem[]>(initialMails)
  const [activeMailId, setActiveMailId] = useState<string | null>(null)
  const [currentMail, setCurrentMail] = useState<MailItem | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [hasMore, setHasMore] = useState(!!initialCursor)
  const [currentPage, setCurrentPage] = useState(1)

  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)

  const [showDetail, setShowDetail] = useState(false)

  const totalLoadedPages = Math.ceil(allMails.length / PAGE_SIZE)
  const totalPages = totalLoadedPages + (hasMore ? 1 : 0)
  const displayMails = allMails.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handlePageChange = useCallback(async (page: number) => {
    if (page < 1) return

    const startIdx = (page - 1) * PAGE_SIZE
    if (startIdx >= allMails.length && hasMore && cursor) {
      setIsListLoading(true)
      const result = await getMailList(folderId, { cursor, count: PAGE_SIZE })
      if (result.data) {
        setAllMails(prev => [...prev, ...result.data!.mails])
        setCursor(result.data.responseMetaData?.nextCursor)
        setHasMore(!!result.data.responseMetaData?.nextCursor)
      }
      setIsListLoading(false)
    }

    setCurrentPage(page)
  }, [allMails.length, hasMore, cursor, folderId])

  const handleSelectMail = useCallback(async (mailId: string) => {
    if (activeMailId === mailId && showDetail) {
      setShowDetail(false)
      setActiveMailId(null)
      setCurrentMail(null)
      setIsDetailLoading(false)
      return
    }

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
  }, [activeMailId, showDetail])

  const handleDelete = useCallback(async (mailId: string) => {
    if (!confirm('이 메일을 삭제하시겠습니까?')) return

    const result = await deleteMail(mailId)
    if (result.error) {
      setError(result.error)
      return
    }

    setAllMails(prev => prev.filter(m => m.mailId !== mailId))
    if (activeMailId === mailId) {
      setActiveMailId(null)
      setCurrentMail(null)
      setShowDetail(false)
    }
  }, [activeMailId])

  const handleBackToList = useCallback(() => {
    setShowDetail(false)
  }, [])

  const pageNumbers: number[] = []
  const maxVisiblePages = 10
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  const mobileFolderSheet = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="메일함 폴더 열기"
          className="h-8 px-2.5"
        >
          <FolderOpen className="h-4 w-4 mr-1.5" />
          폴더
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="border-b border-slate-200 px-4 py-3">
          <SheetTitle className="text-sm">메일함 폴더</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto p-3">
          <EmailFolderNav />
        </div>
      </SheetContent>
    </Sheet>
  )

  const listContent = (
    <>
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-900">{folderName}</span>
          <span className="text-xs text-slate-500 ml-2">{allMails.length}개의 메일</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="md:hidden">
            {mobileFolderSheet}
          </div>
          <Link href="/email/compose">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MailPlus className="h-4 w-4" />
              메일쓰기
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <MailListView
          mails={displayMails}
          activeMailId={activeMailId}
          onSelectMail={handleSelectMail}
          folderName={folderName}
          isLoading={isListLoading}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-3 border-t border-slate-200 shrink-0 bg-slate-50/50">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              onClick={() => handlePageChange(n)}
              className={cn(
                'flex items-center justify-center h-8 min-w-[32px] rounded-lg text-sm font-medium transition-colors',
                n === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              )}
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {error && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="md:hidden h-full min-h-0">
          {showDetail ? (
            <div className="flex flex-col h-full">
              <div className="px-4 py-2.5 border-b border-slate-200 shrink-0 flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-slate-500">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  목록으로
                </Button>
                {mobileFolderSheet}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <MailDetailView
                  mail={currentMail}
                  isLoading={isDetailLoading}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {listContent}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-1 min-h-0">
          <div className={cn('flex flex-col min-h-0', showDetail ? 'w-[48%]' : 'w-full')}>
            {listContent}
          </div>

          {showDetail && (
            <div className="w-[52%] min-h-0 flex flex-col border-l border-slate-200 bg-white">
              <div className="px-4 py-2.5 border-b border-slate-200 shrink-0 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">메일 상세</span>
                <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-8 w-8 text-slate-500">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
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
    </div>
  )
}
