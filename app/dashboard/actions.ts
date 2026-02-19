'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { PIPELINE_STAGES, INQUIRY_SOURCES } from '@/lib/constants'
import type { PipelineStage, InquirySource } from '@/types'
import { revalidatePath } from 'next/cache'

// 대시보드 통계 데이터 조회
export async function getDashboardStats() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 내 모든 고객 조회
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)

  if (error) return { data: null, error: error.message }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  // 기본 통계
  const totalClients = clients?.length || 0
  const activeClients = clients?.filter(c => 
    !['failed', 'on_hold', 'completed'].includes(c.pipeline_stage)
  ).length || 0
  const completedClients = clients?.filter(c => c.pipeline_stage === 'completed').length || 0
  const thisMonthClients = clients?.filter(c => 
    new Date(c.created_at) >= thirtyDaysAgo
  ).length || 0

  // 전환율 계산 (완료 / 전체)
  const conversionRate = totalClients > 0 
    ? Math.round((completedClients / totalClients) * 100) 
    : 0

  // 파이프라인 단계별 통계
  const pipelineStats = Object.keys(PIPELINE_STAGES).map(stage => ({
    stage,
    label: PIPELINE_STAGES[stage as PipelineStage].label,
    color: PIPELINE_STAGES[stage as PipelineStage].color,
    count: clients?.filter(c => c.pipeline_stage === stage).length || 0
  }))

  // 문의 경로별 통계
  const sourceStats = Object.keys(INQUIRY_SOURCES).map(source => ({
    source,
    label: INQUIRY_SOURCES[source as InquirySource].label,
    count: clients?.filter(c => c.inquiry_source === source).length || 0
  })).filter(s => s.count > 0)

  // 월별 신규 고객 추이 (최근 6개월)
  const monthlyStats = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthName = date.toLocaleDateString('ko-KR', { month: 'short' })
    const count = clients?.filter(c => {
      const created = new Date(c.created_at)
      return created >= date && created < nextMonth
    }).length || 0
    monthlyStats.push({ month: monthName, count })
  }

  // 미연락 고객 (3일 이상)
  const overdueClients = clients?.filter(c => {
    if (['failed', 'on_hold', 'completed'].includes(c.pipeline_stage)) return false
    if (!c.last_contacted_at) return true
    return new Date(c.last_contacted_at) < threeDaysAgo
  }).map(c => ({
    id: c.id,
    company_name: c.company_name,
    pipeline_stage: c.pipeline_stage,
    last_contacted_at: c.last_contacted_at,
    days_since_contact: c.last_contacted_at 
      ? Math.floor((now.getTime() - new Date(c.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
      : null
  })) || []

  // 이번 주 활동 필요 고객 (7일 미연락)
  const needsAttention = clients?.filter(c => {
    if (['failed', 'on_hold', 'completed'].includes(c.pipeline_stage)) return false
    if (!c.last_contacted_at) return true
    return new Date(c.last_contacted_at) < sevenDaysAgo
  }).length || 0

  return {
    data: {
      summary: {
        totalClients,
        activeClients,
        completedClients,
        thisMonthClients,
        conversionRate,
        needsAttention,
      },
      pipelineStats,
      sourceStats,
      monthlyStats,
      overdueClients: overdueClients.slice(0, 5), // 최대 5개
    },
    error: null
  }
}

// 최근 활동 로그 조회
export async function getRecentActivities(limit = 10) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      clients (company_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 오늘의 리마인더 조회
export async function getTodayReminders() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('reminders')
    .select(`
      *,
      clients (id, company_name)
    `)
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .lte('due_date', tomorrow.toISOString())
    .order('due_date', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getAllReminders() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('reminders')
    .select(`
      *,
      clients (id, company_name)
    `)
    .eq('user_id', user.id)
    .order('is_completed', { ascending: true })
    .order('due_date', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function toggleReminderCompletion(id: string, isCompleted: boolean) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('reminders')
    .update({ is_completed: isCompleted })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { error: null }
}
