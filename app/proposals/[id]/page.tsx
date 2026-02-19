import { MainLayout } from '@/components/layout'
import { getProposal } from '../actions'
import { notFound } from 'next/navigation'
import { ProposalDetail } from '@/components/proposals/ProposalDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params
  const { data: proposal, error } = await getProposal(id)

  if (error || !proposal) {
    notFound()
  }

  return (
    <MainLayout title={proposal.title}>
      <ProposalDetail proposal={proposal} />
    </MainLayout>
  )
}
