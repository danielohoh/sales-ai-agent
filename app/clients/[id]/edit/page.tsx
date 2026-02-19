import { MainLayout } from '@/components/layout'
import { getClient } from '../../actions'
import { ClientForm } from '@/components/clients/ClientForm'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const { data: client, error } = await getClient(id)

  if (error || !client) {
    notFound()
  }

  return (
    <MainLayout title={`${client.company_name} 수정`}>
      <div className="max-w-3xl">
        <ClientForm client={client} isEdit />
      </div>
    </MainLayout>
  )
}
