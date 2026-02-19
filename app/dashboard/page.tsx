import { MainLayout } from '@/components/layout'
import { getDashboardStats, getRecentActivities, getTodayReminders } from './actions'
import { getTodaySchedules } from '@/app/schedules/actions'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const [statsResult, activitiesResult, remindersResult, schedulesResult] = await Promise.all([
    getDashboardStats(),
    getRecentActivities(),
    getTodayReminders(),
    getTodaySchedules(),
  ])

  return (
    <MainLayout>
      <DashboardContent 
        stats={statsResult.data}
        activities={activitiesResult.data}
        reminders={remindersResult.data}
        todaySchedules={schedulesResult.data}
        error={statsResult.error || activitiesResult.error || remindersResult.error}
      />
    </MainLayout>
  )
}
