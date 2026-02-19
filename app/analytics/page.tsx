import { MainLayout } from '@/components/layout'
import { getReportData } from './actions'
import { ReportDashboard } from '@/components/analytics/ReportDashboard'

interface Props {
  searchParams: Promise<{ period?: 'week' | 'month' | 'quarter' | 'year' }>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams
  const period = params.period || 'month'
  const { data, error } = await getReportData(period)

  return (
    <MainLayout title="영업 리포트">
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      ) : (
        <ReportDashboard data={data} currentPeriod={period} />
      )}
    </MainLayout>
  )
}
