import { MainLayout } from '@/components/layout'
import { getMyClients } from '@/app/clients/actions'
import { ProposalForm } from '@/components/proposals/ProposalForm'

interface Props {
  searchParams: Promise<{ clientId?: string }>
}

export default async function NewProposalPage({ searchParams }: Props) {
  const params = await searchParams
  const { data: clients } = await getMyClients()

  return (
    <MainLayout title="새 제안서 작성">
      <ProposalForm 
        clients={clients || []} 
        initialClientId={params.clientId}
      />
    </MainLayout>
  )
}
