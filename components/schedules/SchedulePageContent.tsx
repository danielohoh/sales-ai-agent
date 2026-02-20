'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar, ScheduleFormModal, ScheduleDetailModal, ScheduleSidebar } from '@/components/schedules'
import { getSchedules, getClientsForSchedule } from '@/app/schedules/actions'
import type { ScheduleWithClient } from '@/types'

export function SchedulePageContent() {
  const [schedules, setSchedules] = useState<ScheduleWithClient[]>([])
  const [clients, setClients] = useState<{
    id: string
    company_name: string
    brand_name: string | null
    contacts: { name: string; phone: string | null; is_primary: boolean }[]
  }[]>([])
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithClient | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // 필터 상태
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // 데이터 로드
  const loadData = async () => {
    setLoading(true)

    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    const [schedulesResult, clientsResult] = await Promise.all([
      getSchedules({
        startDate,
        endDate,
        clientId: selectedClientId || undefined,
      }),
      getClientsForSchedule(),
    ])

    if (schedulesResult.data) {
      setSchedules(schedulesResult.data)
    }

    if (clientsResult.data) {
      setClients(clientsResult.data)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [currentMonth, selectedClientId])

  // 날짜 클릭
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedSchedule(null)
    setShowFormModal(true)
  }

  // 일정 클릭
  const handleScheduleClick = (schedule: ScheduleWithClient) => {
    setSelectedSchedule(schedule)
    setShowDetailModal(true)
  }

  // 빈 시간대 클릭
  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time)
    setShowFormModal(true)
  }

  // 일정 수정
  const handleEditSchedule = () => {
    setShowDetailModal(false)
    setShowFormModal(true)
  }

  // 새 일정 버튼 클릭
  const handleNewSchedule = () => {
    setSelectedSchedule(null)
    setSelectedDate(new Date())
    setShowFormModal(true)
  }

  // 모달 닫기
  const handleCloseFormModal = () => {
    setShowFormModal(false)
    setSelectedSchedule(null)
    setSelectedDate(null)
    setSelectedTime(null)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedSchedule(null)
  }

  // 성공 후 리로드
  const handleSuccess = () => {
    loadData()
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">일정 관리</h1>
          <p className="text-slate-500">미팅, 전화, 데모 등 영업 일정을 관리하세요.</p>
        </div>
        <Button onClick={handleNewSchedule}>
          <Plus className="h-4 w-4 mr-2" />
          새 일정
        </Button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* 캘린더 */}
        <div className="md:col-span-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              로딩 중...
            </div>
          ) : (
            <Calendar
              schedules={schedules}
              onDateClick={handleDateClick}
              onScheduleClick={handleScheduleClick}
            />
          )}
        </div>

        {/* 사이드바 */}
        <div className="col-span-1">
          <ScheduleSidebar
            clients={clients}
            selectedClientId={selectedClientId}
            onClientSelect={setSelectedClientId}
            selectedDate={selectedDate}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </div>
      </div>

      {/* 일정 등록/수정 모달 */}
      <ScheduleFormModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        onSuccess={handleSuccess}
        schedule={selectedSchedule}
        selectedDate={selectedDate || undefined}
        clients={clients}
      />

      {/* 일정 상세 모달 */}
      <ScheduleDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onEdit={handleEditSchedule}
        onSuccess={handleSuccess}
        schedule={selectedSchedule}
      />
    </div>
  )
}
