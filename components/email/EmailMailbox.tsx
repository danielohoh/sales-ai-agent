'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
  getMailFolders,
  getMailList,
  getMailDetail,
  type MailFolder,
  type MailItem,
} from '@/app/email/actions'
import { MailFolderSidebar } from './MailFolderSidebar'
import { MailListView } from './MailListView'
import { MailDetailView } from './MailDetailView'
import { EmailTemplateList } from './EmailTemplateList'

interface EmailTemplate {
  id: string
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[]
  created_at: string
}

interface EmailMailboxProps {
  initialFolders: MailFolder[]
  templates: EmailTemplate[]
}

type MobileView = 'folders' | 'list' | 'detail'

export function EmailMailbox({ initialFolders, templates }: EmailMailboxProps) {
  const [folders, setFolders] = useState<MailFolder[]>(initialFolders)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [activeFolderName, setActiveFolderName] = useState('받은메일함')
  const [mails, setMails] = useState<MailItem[]>([])
  const [activeMailId, setActiveMailId] = useState<string | null>(null)
  const [currentMail, setCurrentMail] = useState<MailItem | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)

  const [isFoldersLoading, setIsFoldersLoading] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const [mobileView, setMobileView] = useState<MobileView>('folders')

  const loadMailList = useCallback(async (folderId: string, append = false) => {
    setIsListLoading(true)
    const opts = append && cursor ? { cursor, count: 30 } : { count: 30 }

    if (folderId === '') {
      const inboxFolder = folders.find(
        (f) =>
          f.folderName.toLowerCase() === 'inbox' ||
          f.folderName.includes('받은')
      )
      if (inboxFolder) {
        folderId = inboxFolder.folderId
      } else if (folders.length > 0) {
        folderId = folders[0].folderId
      }
    }

    if (!folderId) {
      setIsListLoading(false)
      return
    }

    const result = await getMailList(folderId, opts)
    if (result.data) {
      if (append) {
        setMails((prev) => [...prev, ...result.data!.mails])
      } else {
        setMails(result.data.mails)
      }
      setCursor(result.data.responseMetaData?.nextCursor)
      setHasMore(!!result.data.responseMetaData?.nextCursor)
    }
    setIsListLoading(false)
  }, [cursor, folders])

  const loadMailDetail = useCallback(async (mailId: string) => {
    setIsDetailLoading(true)
    const result = await getMailDetail(mailId)
    if (result.data) {
      setCurrentMail(result.data)
    }
    setIsDetailLoading(false)
  }, [])

  const handleSelectFolder = useCallback(
    (folderId: string, folderName: string) => {
      setActiveFolderId(folderId)
      setActiveFolderName(folderName)
      setActiveMailId(null)
      setCurrentMail(null)
      setCursor(undefined)
      setHasMore(false)
      setMails([])
      setMobileView('list')
      loadMailList(folderId)
    },
    [loadMailList]
  )

  const handleSelectMail = useCallback(
    (mailId: string) => {
      setActiveMailId(mailId)
      setMobileView('detail')
      loadMailDetail(mailId)
    },
    [loadMailDetail]
  )

  const handleLoadMore = useCallback(() => {
    if (activeFolderId !== null) {
      loadMailList(activeFolderId, true)
    }
  }, [activeFolderId, loadMailList])

  const handleRefreshFolders = useCallback(async () => {
    setIsFoldersLoading(true)
    const result = await getMailFolders()
    if (result.data) {
      setFolders(result.data)
    }
    setIsFoldersLoading(false)

    if (activeFolderId !== null) {
      setCursor(undefined)
      loadMailList(activeFolderId)
    }
  }, [activeFolderId, loadMailList])

  useEffect(() => {
    if (initialFolders.length > 0 && activeFolderId === null) {
      const inbox = initialFolders.find(
        (f) =>
          f.folderName.toLowerCase() === 'inbox' ||
          f.folderName.includes('받은')
      )
      const first = inbox || initialFolders[0]
      handleSelectFolder(first.folderId, inbox ? '받은메일함' : first.folderName)
    }
  }, [initialFolders, activeFolderId, handleSelectFolder])

  return (
    <Tabs defaultValue="mailbox" className="space-y-4">
      <TabsList>
        <TabsTrigger value="mailbox">메일함</TabsTrigger>
        <TabsTrigger value="templates">템플릿</TabsTrigger>
      </TabsList>

      <TabsContent value="mailbox" className="mt-0">
        <div className="hidden md:grid md:grid-cols-[240px_340px_1fr] h-[calc(100vh-200px)] border border-slate-200 rounded-xl overflow-hidden">
          <MailFolderSidebar
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={handleSelectFolder}
            onRefresh={handleRefreshFolders}
            isRefreshing={isFoldersLoading}
          />
          <MailListView
            mails={mails}
            activeMailId={activeMailId}
            onSelectMail={handleSelectMail}
            folderName={activeFolderName}
            isLoading={isListLoading}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
          <MailDetailView mail={currentMail} isLoading={isDetailLoading} />
        </div>

        <div className="md:hidden border border-slate-200 rounded-xl overflow-hidden h-[calc(100vh-200px)]">
          {mobileView === 'folders' && (
            <MailFolderSidebar
              folders={folders}
              activeFolderId={activeFolderId}
              onSelectFolder={handleSelectFolder}
              onRefresh={handleRefreshFolders}
              isRefreshing={isFoldersLoading}
            />
          )}

          {mobileView === 'list' && (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 border-b border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView('folders')}
                  className="text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  메일함 목록
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <MailListView
                  mails={mails}
                  activeMailId={activeMailId}
                  onSelectMail={handleSelectMail}
                  folderName={activeFolderName}
                  isLoading={isListLoading}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMore}
                />
              </div>
            </div>
          )}

          {mobileView === 'detail' && (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 border-b border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView('list')}
                  className="text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  메일 목록
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <MailDetailView mail={currentMail} isLoading={isDetailLoading} />
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="templates" className="mt-0">
        <EmailTemplateList templates={templates} />
      </TabsContent>
    </Tabs>
  )
}
