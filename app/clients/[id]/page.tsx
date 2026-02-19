import { MainLayout } from '@/components/layout'
import { getClient } from '../actions'
import { notFound } from 'next/navigation'
import { ClientDetail } from '@/components/clients/ClientDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const { data: client, error } = await getClient(id)

  if (error || !client) {
    notFound()
  }

  return (
    <MainLayout title={client.company_name}>
      <ClientDetail client={client} />
    </MainLayout>
  )
}
