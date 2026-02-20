'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface ReportData {
  period: string
  periodLabel: string
  newClients: number
  totalClients: number
  pipelineStats: { stage: string; label: string; count: number }[]
  completed: number
  failed: number
  inProgress: number
  conversionRate: number
  totalActivities: number
  callCount: number
  emailCount: number
  meetingCount: number
  sourceStats: { source: string; label: string; count: number; completedCount: number }[]
  avgSalesCycle: number
}

interface ReportDashboardProps {
  data: ReportData | null
  currentPeriod: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function ReportDashboard({ data, currentPeriod }: ReportDashboardProps) {
  const router = useRouter()

  if (!data) {
    return (
      <div className="text-center py-10 text-slate-500">
        데이터를 불러오는 중...
      </div>
    )
  }

  const handlePeriodChange = (period: string) => {
    router.push(`/analytics?period=${period}`)
  }

  // 활동 데이터 (파이 차트용)
  const activityData = [
    { name: '통화', value: data.callCount },
    { name: '이메일', value: data.emailCount },
    { name: '미팅', value: data.meetingCount },
  ].filter(d => d.value > 0)

  // 전환 퍼널 데이터
  const funnelData = [
    { name: '전체', value: data.totalClients },
    { name: '진행중', value: data.inProgress },
    { name: '완료', value: data.completed },
  ]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-slate-500">{data.periodLabel} 영업 성과 리포트</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <Select value={currentPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-11 w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="quarter">이번 분기</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/analytics/failure" className="w-full sm:w-auto">
            <Button variant="outline" className="min-h-11 w-full sm:w-auto">
              실패 분석 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">전체 고객</p>
                <p className="text-3xl font-bold">{data.totalClients}</p>
                <p className="text-xs text-green-600">+{data.newClients} 신규</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">전환율</p>
                <p className="text-3xl font-bold">{data.conversionRate}%</p>
                <p className="text-xs text-slate-500">{data.completed}/{data.totalClients} 계약</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">평균 영업 주기</p>
                <p className="text-3xl font-bold">{data.avgSalesCycle}</p>
                <p className="text-xs text-slate-500">일</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">총 활동</p>
                <p className="text-3xl font-bold">{data.totalActivities}</p>
                <p className="text-xs text-slate-500">건</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>파이프라인 현황</CardTitle>
            <CardDescription>단계별 고객 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.pipelineStats.filter(s => s.count > 0)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 활동 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>활동 분포</CardTitle>
            <CardDescription>활동 유형별 비율</CardDescription>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {activityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                활동 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 활동 요약 & 문의 경로 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>활동 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <span>통화</span>
                </div>
                <Badge variant="secondary">{data.callCount}건</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-green-500" />
                  <span>이메일</span>
                </div>
                <Badge variant="secondary">{data.emailCount}건</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <span>미팅</span>
                </div>
                <Badge variant="secondary">{data.meetingCount}건</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 문의 경로별 전환율 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 경로별 성과</CardTitle>
            <CardDescription>경로별 고객 수 및 전환율</CardDescription>
          </CardHeader>
          <CardContent>
            {data.sourceStats.length > 0 ? (
              <div className="space-y-3">
                {data.sourceStats.map((source) => {
                  const rate = source.count > 0 
                    ? Math.round((source.completedCount / source.count) * 100) 
                    : 0
                  return (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="font-medium">{source.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">{source.count}명</span>
                        <Badge variant={rate >= 30 ? 'default' : 'secondary'}>
                          {rate}% 전환
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">
                문의 경로 데이터가 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 전환 퍼널 */}
      <Card>
        <CardHeader>
          <CardTitle>전환 퍼널</CardTitle>
          <CardDescription>고객 여정 단계별 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            {funnelData.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div className="text-center">
                  <div 
                    className="mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                      width: `${Math.max(60, 120 - index * 30)}px`,
                      height: `${Math.max(60, 120 - index * 30)}px`,
                      backgroundColor: COLORS[index],
                    }}
                  >
                    {item.value}
                  </div>
                  <p className="text-sm font-medium">{item.name}</p>
                </div>
                {index < funnelData.length - 1 && (
                  <ArrowRight className="h-6 w-6 mx-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
