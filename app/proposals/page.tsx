import { MainLayout } from '@/components/layout'
import { getProposals } from './actions'
import { ProposalList } from '@/components/proposals/ProposalList'

export default async function ProposalsPage() {
  const { data: proposals, error } = await getProposals()

  return (
    <MainLayout title="제안서 관리">
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      ) : (
        <ProposalList proposals={proposals || []} />
      )}
    </MainLayout>
  )
}
