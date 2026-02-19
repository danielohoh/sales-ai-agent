import { MainLayout } from '@/components/layout'
import { getAllReminders } from '@/app/dashboard/actions'
import { TasksPageContent } from '@/components/tasks/TasksPageContent'

export default async function TasksPage() {
  const remindersResult = await getAllReminders()

  return (
    <MainLayout title="할일">
      <TasksPageContent reminders={remindersResult.data || []} />
    </MainLayout>
  )
}
