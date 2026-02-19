import { MainLayout } from '@/components/layout'
import { getMyClients } from '../actions'
import { KanbanBoard } from '@/components/clients/KanbanBoard'

export default async function KanbanPage() {
  const { data: clients, error } = await getMyClients()

  return (
    <MainLayout title="파이프라인 관리">
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      ) : (
        <KanbanBoard clients={clients || []} />
      )}
    </MainLayout>
  )
}
