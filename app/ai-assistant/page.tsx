import { MainLayout } from '@/components/layout'
import { AIChatWithHistory } from '@/components/ai/AIChatWithHistory'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AIAssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <MainLayout title="AI 영업 비서">
      <AIChatWithHistory userId={user.id} />
    </MainLayout>
  )
}
