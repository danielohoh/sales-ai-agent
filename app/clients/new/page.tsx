import { MainLayout } from '@/components/layout'
import { ClientForm } from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <MainLayout title="새 고객 등록">
      <div className="max-w-3xl">
        <ClientForm />
      </div>
    </MainLayout>
  )
}
