import { MainLayout } from '@/components/layout'
import { getEmailTemplates } from './actions'
import { EmailTemplateList } from '@/components/email/EmailTemplateList'

export default async function EmailPage() {
  const { data: templates, error } = await getEmailTemplates()

  return (
    <MainLayout title="이메일 템플릿">
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      ) : (
        <EmailTemplateList templates={templates || []} />
      )}
    </MainLayout>
  )
}
