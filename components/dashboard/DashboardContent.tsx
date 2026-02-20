import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  Building2,
} from 'lucide-react'
import { PipelineChart, SourceChart, MonthlyChart, ConversionFunnel } from './Charts'
import { TodaySchedulesWidget } from './TodaySchedulesWidget'
import { TodoListWidget } from './TodoListWidget'
import { PIPELINE_STAGES, ACTIVITY_TYPES } from '@/lib/constants'
import type { PipelineStage, ActivityType, ScheduleWithClient } from '@/types'

interface DashboardContentProps {
  stats: {
    summary: {
      totalClients: number
      activeClients: number
      completedClients: number
      thisMonthClients: number
      conversionRate: number
      needsAttention: number
    }
    pipelineStats: { stage: string; label: string; count: number; color: string }[]
    sourceStats: { source: string; label: string; count: number }[]
    monthlyStats: { month: string; count: number }[]
    overdueClients: {
      id: string
      company_name: string
      pipeline_stage: string
      last_contacted_at: string | null
      days_since_contact: number | null
    }[]
  } | null
  activities: {
    id: string
    activity_type: string
    description: string
    created_at: string
    clients: { company_name: string } | null
  }[] | null
  reminders: {
    id: string
    message: string
    due_date: string
    reminder_type: string
    is_completed?: boolean
    clients: { id: string; company_name: string } | null
  }[] | null
  todaySchedules?: ScheduleWithClient[] | null
  error: string | null
  userId?: string
}

export function DashboardContent({ stats, activities, reminders, todaySchedules, error }: DashboardContentProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-500">
        데이터를 불러오는 중...
      </div>
    )
  }

  const { summary, pipelineStats, sourceStats, monthlyStats, overdueClients } = stats

  return (
    <div className="space-y-5">
      {/* 페이지 헤더 */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
        <p className="text-sm text-slate-500">영업 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 카드 4열 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">전체 고객</p>
                <p className="text-2xl font-bold">{summary.totalClients}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">진행 중</p>
                <p className="text-2xl font-bold">{summary.activeClients}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">계약 완료</p>
                <p className="text-2xl font-bold">{summary.completedClients}</p>
                <p className="text-xs text-green-600">전환율 {summary.conversionRate}%</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.needsAttention > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">주의 필요</p>
                <p className="text-3xl font-bold text-orange-600">{summary.needsAttention}</p>
                <p className="text-xs text-slate-500">7일 이상 미연락</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* 파이프라인 현황 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>파이프라인 현황</CardTitle>
                <CardDescription>단계별 고객 분포</CardDescription>
              </div>
              <Link href="/clients/kanban">
                <Button variant="outline" size="sm">
                  칸반 보드 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <PipelineChart data={pipelineStats} />
            </CardContent>
          </Card>

          {/* 월별 신규 고객 추이 */}
          <Card>
            <CardHeader>
              <CardTitle>월별 신규 고객</CardTitle>
              <CardDescription>최근 6개월 신규 고객 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={monthlyStats} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {/* 오늘 일정 */}
          {todaySchedules && <TodaySchedulesWidget schedules={todaySchedules} />}

          {/* 오늘의 리마인더 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                오늘의 할 일
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reminders && reminders.length > 0 ? (
                <TodoListWidget reminders={reminders} />
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  오늘 예정된 할 일이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 미연락 고객 */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                연락 필요
              </CardTitle>
              <CardDescription>3일 이상 미연락 고객</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueClients.length > 0 ? (
                <div className="space-y-3">
                  {overdueClients.map((client) => {
                    const stageInfo = PIPELINE_STAGES[client.pipeline_stage as PipelineStage]
                    return (
                      <Link 
                        key={client.id} 
                        href={`/clients/${client.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">{client.company_name}</p>
                            <p className="text-xs text-slate-500">
                              {client.days_since_contact !== null 
                                ? `${client.days_since_contact}일 전`
                                : '연락 기록 없음'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stageInfo?.label}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  모든 고객에게 최근 연락했습니다! 👍
                </p>
              )}
            </CardContent>
          </Card>

          {/* 문의 경로 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>문의 경로 분석</CardTitle>
              <CardDescription>고객 유입 채널</CardDescription>
            </CardHeader>
            <CardContent>
              <SourceChart data={sourceStats} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 최근 활동 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 기록된 활동 내역</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const activityInfo = ACTIVITY_TYPES[activity.activity_type as ActivityType]
                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="text-2xl">{activityInfo?.icon || '📝'}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {activity.clients?.company_name || '알 수 없음'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(activity.created_at), 'MM/dd HH:mm', { locale: ko })}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">
                        {activityInfo?.label}: {activity.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              아직 활동 기록이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
