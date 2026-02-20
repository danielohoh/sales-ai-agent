'use client'

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
  LineChart,
  Line,
} from 'recharts'

interface PipelineChartProps {
  data: { stage: string; label: string; count: number; color: string }[]
}

export function PipelineChart({ data }: PipelineChartProps) {
  // 칸반에 표시되는 주요 단계만 필터링
  const filteredData = data.filter(d => 
    !['failed', 'on_hold'].includes(d.stage)
  )

  return (
    <div className="h-[240px] sm:h-[280px] md:h-[300px] w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filteredData} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis 
            type="category" 
            dataKey="label" 
            width={72}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number | string | undefined) => [`${value ?? 0}개`, '고객 수']}
            contentStyle={{ borderRadius: '8px' }}
          />
          <Bar 
            dataKey="count" 
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SourceChartProps {
  data: { source: string; label: string; count: number }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function SourceChart({ data }: SourceChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  if (data.length === 0) {
    return (
      <div className="h-[220px] sm:h-[260px] md:h-[300px] flex items-center justify-center text-slate-400">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="h-[220px] sm:h-[260px] md:h-[300px] w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
            dataKey="count"
            nameKey="label"
            fill="#3b82f6"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          />
          <Tooltip 
            formatter={(value: number | string | undefined) => [`${value ?? 0}개`, '고객 수']}
            contentStyle={{ borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MonthlyChartProps {
  data: { month: string; count: number }[]
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="h-[220px] sm:h-[260px] md:h-[300px] w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: number | string | undefined) => [`${value ?? 0}개`, '신규 고객']}
            contentStyle={{ borderRadius: '8px' }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface ConversionFunnelProps {
  data: { stage: string; label: string; count: number }[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  // 주요 전환 단계만 선택
  const funnelStages = ['inquiry', 'called', 'meeting', 'in_progress', 'completed']
  const funnelData = funnelStages
    .map(stage => data.find(d => d.stage === stage))
    .filter(Boolean) as { stage: string; label: string; count: number }[]

  if (funnelData.length === 0 || funnelData[0].count === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400">
        데이터가 없습니다
      </div>
    )
  }

  const maxCount = funnelData[0].count

  return (
    <div className="space-y-3 py-4">
      {funnelData.map((item, index) => {
        const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0
        const conversionFromPrev = index > 0 && funnelData[index - 1].count > 0
          ? Math.round((item.count / funnelData[index - 1].count) * 100)
          : 100

        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-slate-500">
                {item.count}개
                {index > 0 && (
                  <span className="ml-2 text-xs text-blue-600">
                    ({conversionFromPrev}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                style={{ width: `${Math.max(widthPercent, 5)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
