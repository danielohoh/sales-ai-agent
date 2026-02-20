import { MainLayout } from '@/components/layout'
import { getEmailTemplates, getMailFolders } from './actions'
import { EmailMailbox } from '@/components/email/EmailMailbox'

export default async function EmailPage() {
  const [templatesResult, foldersResult] = await Promise.all([
    getEmailTemplates(),
    getMailFolders(),
  ])

  return (
    <MainLayout title="이메일">
      <EmailMailbox
        initialFolders={foldersResult.data || []}
        templates={templatesResult.data || []}
      />
    </MainLayout>
  )
}
