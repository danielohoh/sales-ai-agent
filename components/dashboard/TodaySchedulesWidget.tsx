'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SCHEDULE_TYPES } from '@/lib/constants'
import type { ScheduleWithClient, ScheduleType } from '@/types'

interface TodaySchedulesWidgetProps {
  schedules: ScheduleWithClient[]
}

export function TodaySchedulesWidget({ schedules }: TodaySchedulesWidgetProps) {
  const upcomingSchedules = schedules
    .filter(s => s.status === 'scheduled')
    .slice(0, 4)

  const getNaverSearchLink = (address: string) =>
    `https://map.naver.com/p/search/${encodeURIComponent(address)}`

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          오늘 일정
        </CardTitle>
        <Link href="/schedules">
          <Button variant="ghost" size="sm">
            전체 보기 <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {upcomingSchedules.length > 0 ? (
          <div className="space-y-3">
            {upcomingSchedules.map(schedule => {
              const typeInfo = SCHEDULE_TYPES[schedule.schedule_type as ScheduleType]
              const startTime = parseISO(schedule.start_date)

              return (
                <div
                  key={schedule.id}
                  className={`p-3 rounded-lg border-l-4 ${typeInfo.bgColor}`}
                  style={{ borderLeftColor: typeInfo.color.replace('text-', '').replace('-700', '') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{typeInfo.icon}</span>
                        <span className="font-medium">{schedule.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(startTime, 'HH:mm')}
                        </span>
                        {schedule.location && (
                          <a
                            href={getNaverSearchLink(schedule.location)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            {schedule.location}
                          </a>
                        )}
                      </div>
                      {schedule.clients && (
                        <div className="text-sm text-gray-500 mt-1">
                          {schedule.clients.company_name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={typeInfo.color}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>오늘 예정된 일정이 없습니다</p>
            <Link href="/schedules">
              <Button variant="link" size="sm" className="mt-2">
                일정 추가하기
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
