import { MainLayout } from '@/components/layout'
import { getMyClients } from './actions'
import { ClientList } from '@/components/clients/ClientList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ClientsPage() {
  const { data: clients, error } = await getMyClients()

  return (
    <MainLayout title="고객 관리">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500">
              총 {clients?.length || 0}개의 고객사를 관리하고 있습니다.
            </p>
          </div>
          <Link href="/clients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 고객 등록
            </Button>
          </Link>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* 고객 목록 */}
        <ClientList clients={clients || []} />
      </div>
    </MainLayout>
  )
}
