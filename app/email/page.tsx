import { MainLayout } from '@/components/layout'
import { getMailFolders, getMailList, type MailFolder, type MailItem } from './actions'
import { EmailMailbox } from '@/components/email/EmailMailbox'

function resolveFolderType(folders: MailFolder[], type: string): MailFolder | null {
  const searchType = type === 'all' ? 'inbox' : type

  for (const folder of folders) {
    const name = folder.folderName.toLowerCase()
    switch (searchType) {
      case 'inbox':
        if (name === 'inbox' || name.includes('받은')) return folder
        break
      case 'sent':
        if ((name === 'sent' || name === 'sentbox' || name.includes('보낸')) && !name.includes('2')) return folder
        break
      case 'draft':
        if (name === 'draft' || name === 'drafts' || name.includes('임시')) return folder
        break
      case 'receipt':
        if (name.includes('수신')) return folder
        break
      case 'memo':
        if (name.includes('메모')) return folder
        break
      case 'trash':
        if (name === 'trash' || name.includes('휴지')) return folder
        break
      case 'spam':
        if (name === 'junk' || name === 'spam' || name.includes('스팸')) return folder
        break
    }
  }

  return folders.find(f => f.folderId === type) || null
}

const FOLDER_LABELS: Record<string, string> = {
  all: '전체메일',
  inbox: '받은메일함',
  sent: '보낸메일함',
  receipt: '수신확인',
  draft: '임시보관함',
  trash: '휴지통',
  spam: '스팸메일함',
  memo: '메모함',
}

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>
}) {
  const params = await searchParams
  const folderType = params.folder || 'inbox'

  const foldersResult = await getMailFolders()
  const folders = foldersResult.data || []
  const targetFolder = resolveFolderType(folders, folderType)

  let mails: MailItem[] = []
  let nextCursor: string | undefined
  let mailError: string | null = foldersResult.error || null

  if (targetFolder) {
    const result = await getMailList(targetFolder.folderId, { count: 30 })
    if (result.data) {
      mails = result.data.mails
      nextCursor = result.data.responseMetaData?.nextCursor
    } else if (result.error) {
      mailError = result.error
    }
  } else if (!mailError && folders.length > 0) {
    mailError = `폴더를 찾을 수 없습니다: ${folderType}`
  }

  const folderName = FOLDER_LABELS[folderType] || targetFolder?.folderName || folderType

  return (
    <MainLayout title="이메일">
      <EmailMailbox
        folderType={folderType}
        folderId={targetFolder?.folderId || ''}
        folderName={folderName}
        initialMails={mails}
        initialCursor={nextCursor}
        initialError={mailError}
      />
    </MainLayout>
  )
}
