'use client'

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
import { ArrowLeft, AlertTriangle, TrendingDown, Building2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface FailureData {
  totalFailed: number
  categoryStats: {
    category: string
    label: string
    description: string
    count: number
  }[]
  monthlyFailures: { month: string; count: number }[]
  recentFailures: {
    id: string
    company_name: string
    failure_category: string | null
    failure_reason: string | null
    updated_at: string
  }[]
}

interface FailureAnalysisProps {
  data: FailureData | null
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e']

export function FailureAnalysis({ data }: FailureAnalysisProps) {
  if (!data) {
    return (
      <div className="text-center py-10 text-slate-500">
        데이터를 불러오는 중...
      </div>
    )
  }

  const categoryDataWithPercent = data.categoryStats
    .filter(c => c.count > 0)
    .map(c => ({
      ...c,
      percent: data.totalFailed > 0 ? Math.round((c.count / data.totalFailed) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link 
            href="/analytics" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            리포트로 돌아가기
          </Link>
          <p className="text-slate-500">실패 사유를 분석하여 영업 전략을 개선하세요.</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">총 실패 건수</p>
                <p className="text-3xl font-bold text-red-700">{data.totalFailed}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-500">가장 많은 실패 사유</p>
              <p className="text-xl font-bold">
                {categoryDataWithPercent[0]?.label || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {categoryDataWithPercent[0]?.count || 0}건 
                ({categoryDataWithPercent[0]?.percent || 0}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-500">이번 달 실패</p>
              <p className="text-xl font-bold">
                {data.monthlyFailures[data.monthlyFailures.length - 1]?.count || 0}건
              </p>
              <p className="text-sm text-slate-500">
                전월 대비 {' '}
                {(() => {
                  const current = data.monthlyFailures[data.monthlyFailures.length - 1]?.count || 0
                  const prev = data.monthlyFailures[data.monthlyFailures.length - 2]?.count || 0
                  const diff = current - prev
                  if (diff > 0) return <span className="text-red-500">+{diff}</span>
                  if (diff < 0) return <span className="text-green-500">{diff}</span>
                  return <span>0</span>
                })()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>실패 사유 분포</CardTitle>
            <CardDescription>카테고리별 실패 건수</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryDataWithPercent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={categoryDataWithPercent}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="label"
                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  >
                    {categoryDataWithPercent.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                실패 데이터가 없습니다 👍
              </div>
            )}
          </CardContent>
        </Card>

        {/* 월별 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 실패 추이</CardTitle>
            <CardDescription>최근 6개월</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
              <LineChart data={data.monthlyFailures}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리별 상세 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 분석</CardTitle>
          <CardDescription>각 실패 사유에 대한 상세 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.categoryStats.map((category) => {
              const percent = data.totalFailed > 0 
                ? Math.round((category.count / data.totalFailed) * 100) 
                : 0
              return (
                <div key={category.category} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{category.label}</span>
                      <span className="text-sm text-slate-500 ml-2">
                        {category.description}
                      </span>
                    </div>
                    <Badge variant={category.count > 0 ? 'destructive' : 'secondary'}>
                      {category.count}건 ({percent}%)
                    </Badge>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 최근 실패 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 실패 고객</CardTitle>
          <CardDescription>최근 실패로 분류된 고객 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentFailures.length > 0 ? (
            <div className="space-y-3">
              {data.recentFailures.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-blue-600 hover:underline">
                        {client.company_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(client.updated_at), 'MM/dd', { locale: ko })}
                      </p>
                    </div>
                    {client.failure_category && (
                      <Badge variant="outline" className="mt-1">
                        {data.categoryStats.find(c => c.category === client.failure_category)?.label || client.failure_category}
                      </Badge>
                    )}
                    {client.failure_reason && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {client.failure_reason}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">
              실패한 고객이 없습니다 🎉
            </p>
          )}
        </CardContent>
      </Card>

      {/* 개선 제안 */}
      {categoryDataWithPercent.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 개선 제안</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="space-y-2">
              {categoryDataWithPercent[0]?.category === 'price' && (
                <li>• 가격이 주요 실패 사유입니다. 단계별 도입 플랜이나 할인 프로모션을 검토해보세요.</li>
              )}
              {categoryDataWithPercent[0]?.category === 'timing' && (
                <li>• 타이밍이 주요 실패 사유입니다. 리마인더를 활용하여 적절한 시기에 재연락하세요.</li>
              )}
              {categoryDataWithPercent[0]?.category === 'competitor' && (
                <li>• 경쟁사 대비 차별점을 강조하는 제안서를 준비해보세요.</li>
              )}
              {categoryDataWithPercent[0]?.category === 'feature' && (
                <li>• 기능 관련 피드백을 제품팀에 전달하여 개선을 검토해보세요.</li>
              )}
              <li>• 실패 고객에게 6개월 후 재연락하여 상황 변화를 확인해보세요.</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
