import { MainLayout } from '@/components/layout'
import { getEmailTemplates, getNaverWorksConnectionStatus } from '../actions'
import { getMyClients } from '@/app/clients/actions'
import { EmailComposer } from '@/components/email/EmailComposer'

interface Props {
  searchParams: Promise<{
    clientId?: string
    templateId?: string
    naverWorksConnected?: string
    naverWorksError?: string
  }>
}

export default async function ComposeEmailPage({ searchParams }: Props) {
  const params = await searchParams
  const [templatesResult, clientsResult, naverWorksStatus] = await Promise.all([
    getEmailTemplates(),
    getMyClients(),
    getNaverWorksConnectionStatus(),
  ])

  return (
    <MainLayout title="이메일 작성">
      <EmailComposer
        templates={templatesResult.data || []}
        clients={clientsResult.data || []}
        initialClientId={params.clientId}
        initialTemplateId={params.templateId}
        naverWorksConnected={naverWorksStatus.connected || params.naverWorksConnected === '1'}
        naverWorksError={params.naverWorksError || naverWorksStatus.error || ''}
      />
    </MainLayout>
  )
}
