'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SCHEDULE_TYPES } from '@/lib/constants'
import type { ScheduleWithClient, ScheduleType } from '@/types'

interface CalendarProps {
  schedules: ScheduleWithClient[]
  onDateClick: (date: Date) => void
  onScheduleClick: (schedule: ScheduleWithClient) => void
}

export function Calendar({ schedules, onDateClick, onScheduleClick }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const days = []
  let day = startDate

  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getSchedulesForDay = (date: Date) => {
    return schedules.filter(schedule => {
      const scheduleDate = parseISO(schedule.start_date)
      return isSameDay(scheduleDate, date)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold ml-2">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
        </div>
        <Button variant="outline" onClick={goToToday}>
          오늘
        </Button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName, i) => (
          <div
            key={dayName}
            className={cn(
              'py-2 text-center text-sm font-medium',
              i === 0 && 'text-red-500',
              i === 6 && 'text-blue-500'
            )}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const daySchedules = getSchedulesForDay(day)
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const dayOfWeek = day.getDay()

          return (
            <div
              key={idx}
              onClick={() => onDateClick(day)}
              className={cn(
                'min-h-[112px] p-1 border-b border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors',
                !isCurrentMonth && 'bg-gray-50',
                idx % 7 === 6 && 'border-r-0'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday && 'bg-blue-600 text-white',
                  !isToday && dayOfWeek === 0 && 'text-red-500',
                  !isToday && dayOfWeek === 6 && 'text-blue-500',
                  !isCurrentMonth && 'text-gray-400'
                )}
              >
                {format(day, 'd')}
              </div>

              {/* 일정 목록 */}
              <div className="space-y-1">
                {daySchedules.slice(0, 3).map((schedule) => {
                  const typeInfo = SCHEDULE_TYPES[schedule.schedule_type as ScheduleType]
                  return (
                    <div
                      key={schedule.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onScheduleClick(schedule)
                      }}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                        typeInfo.bgColor,
                        typeInfo.color,
                        schedule.status === 'completed' && 'opacity-60 line-through',
                        schedule.status === 'cancelled' && 'opacity-40 line-through'
                      )}
                    >
                      {format(parseISO(schedule.start_date), 'HH:mm')} {schedule.title}
                    </div>
                  )
                })}
                {daySchedules.length > 3 && (
                  <div className="text-xs text-slate-500 px-1">
                    +{daySchedules.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="p-3 border-t border-slate-200 flex flex-wrap gap-3">
        {Object.entries(SCHEDULE_TYPES).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <div className={cn('w-3 h-3 rounded', value.bgColor)} />
            <span>{value.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
