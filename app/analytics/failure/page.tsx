import { MainLayout } from '@/components/layout'
import { getFailureAnalytics } from '../actions'
import { FailureAnalysis } from '@/components/analytics/FailureAnalysis'

export default async function FailureAnalyticsPage() {
  const { data, error } = await getFailureAnalytics()

  return (
    <MainLayout title="실패 분석">
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      ) : (
        <FailureAnalysis data={data} />
      )}
    </MainLayout>
  )
}
