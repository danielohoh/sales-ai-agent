'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { PIPELINE_STAGES, INQUIRY_SOURCES, FAILURE_CATEGORIES } from '@/lib/constants'
import type { PipelineStage, InquirySource, FailureCategory } from '@/types'

// 실패 분석 데이터 조회
export async function getFailureAnalytics() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 실패한 고객 조회
  const { data: failedClients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .eq('pipeline_stage', 'failed')

  if (error) return { data: null, error: error.message }

  // 카테고리별 집계
  const categoryStats = Object.keys(FAILURE_CATEGORIES).map(category => ({
    category,
    label: FAILURE_CATEGORIES[category as FailureCategory].label,
    description: FAILURE_CATEGORIES[category as FailureCategory].description,
    count: failedClients?.filter(c => c.failure_category === category).length || 0,
  }))

  // 월별 실패 추이 (최근 6개월)
  const now = new Date()
  const monthlyFailures = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthName = date.toLocaleDateString('ko-KR', { month: 'short' })
    const count = failedClients?.filter(c => {
      const updated = new Date(c.updated_at)
      return updated >= date && updated < nextMonth
    }).length || 0
    monthlyFailures.push({ month: monthName, count })
  }

  // 실패 사유 목록 (최근 10개)
  const recentFailures = failedClients
    ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      company_name: c.company_name,
      failure_category: c.failure_category,
      failure_reason: c.failure_reason,
      updated_at: c.updated_at,
    })) || []

  return {
    data: {
      totalFailed: failedClients?.length || 0,
      categoryStats,
      monthlyFailures,
      recentFailures,
    },
    error: null
  }
}

// 종합 리포트 데이터 조회
export async function getReportData(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }

  // 전체 고객 조회
  const { data: allClients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)

  // 기간 내 고객
  const periodClients = allClients?.filter(c => 
    new Date(c.created_at) >= startDate
  ) || []

  // 기간 내 활동 로그
  const { data: activities } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', startDate.toISOString())

  // 통계 계산
  const stats = {
    period,
    periodLabel: period === 'week' ? '이번 주' : 
                 period === 'month' ? '이번 달' :
                 period === 'quarter' ? '이번 분기' : '올해',
    
    // 고객 통계
    newClients: periodClients.length,
    totalClients: allClients?.length || 0,
    
    // 파이프라인 통계
    pipelineStats: Object.keys(PIPELINE_STAGES).map(stage => ({
      stage,
      label: PIPELINE_STAGES[stage as PipelineStage].label,
      count: allClients?.filter(c => c.pipeline_stage === stage).length || 0,
    })),
    
    // 전환 통계
    completed: allClients?.filter(c => c.pipeline_stage === 'completed').length || 0,
    failed: allClients?.filter(c => c.pipeline_stage === 'failed').length || 0,
    inProgress: allClients?.filter(c => 
      !['completed', 'failed', 'on_hold'].includes(c.pipeline_stage)
    ).length || 0,
    
    // 전환율
    conversionRate: allClients && allClients.length > 0
      ? Math.round((allClients.filter(c => c.pipeline_stage === 'completed').length / allClients.length) * 100)
      : 0,
    
    // 활동 통계
    totalActivities: activities?.length || 0,
    callCount: activities?.filter(a => a.activity_type === 'call').length || 0,
    emailCount: activities?.filter(a => a.activity_type === 'email_sent').length || 0,
    meetingCount: activities?.filter(a => a.activity_type === 'meeting').length || 0,
    
    // 문의 경로별 통계
    sourceStats: Object.keys(INQUIRY_SOURCES).map(source => ({
      source,
      label: INQUIRY_SOURCES[source as InquirySource].label,
      count: allClients?.filter(c => c.inquiry_source === source).length || 0,
      completedCount: allClients?.filter(c => 
        c.inquiry_source === source && c.pipeline_stage === 'completed'
      ).length || 0,
    })).filter(s => s.count > 0),
    
    // 평균 영업 주기 (계약 완료 고객 기준)
    avgSalesCycle: (() => {
      const completedClients = allClients?.filter(c => c.pipeline_stage === 'completed') || []
      if (completedClients.length === 0) return 0
      
      const totalDays = completedClients.reduce((sum, c) => {
        const created = new Date(c.created_at)
        const updated = new Date(c.updated_at)
        return sum + Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      }, 0)
      
      return Math.round(totalDays / completedClients.length)
    })(),
  }

  return { data: stats, error: null }
}

// 성과 순위 (영업담당자별 - 향후 확장용)
export async function getPerformanceRanking() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 현재는 단일 사용자이므로 본인 성과만 반환
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const myStats = {
    userId: user.id,
    name: userData?.name || user.email || '나',
    totalClients: clients?.length || 0,
    completed: clients?.filter(c => c.pipeline_stage === 'completed').length || 0,
    inProgress: clients?.filter(c => 
      !['completed', 'failed', 'on_hold'].includes(c.pipeline_stage)
    ).length || 0,
    conversionRate: clients && clients.length > 0
      ? Math.round((clients.filter(c => c.pipeline_stage === 'completed').length / clients.length) * 100)
      : 0,
  }

  return { data: [myStats], error: null }
}
