'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Plus, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SCHEDULE_TYPES, DEFAULT_CHECKLIST } from '@/lib/constants'
import { createSchedule, updateSchedule } from '@/app/schedules/actions'
import type { ScheduleType, ScheduleWithClient, ChecklistItem } from '@/types'

interface ScheduleFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  schedule?: ScheduleWithClient | null
  selectedDate?: Date
  clients: {
    id: string
    company_name: string
    brand_name: string | null
    contacts: { name: string; phone: string | null; is_primary: boolean }[]
  }[]
}

export function ScheduleFormModal({
  isOpen,
  onClose,
  onSuccess,
  schedule,
  selectedDate,
  clients,
}: ScheduleFormModalProps) {
  const isEdit = !!schedule

  const [formData, setFormData] = useState({
    title: '',
    schedule_type: 'meeting' as ScheduleType,
    description: '',
    date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
    start_time: '10:00',
    end_time: '11:00',
    all_day: false,
    client_id: '',
    location: '',
    contact_name: '',
    contact_phone: '',
  })

  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const getNaverSearchUrl = (query: string) => {
    const keyword = query.trim() || clientSearch.trim() || formData.title.trim()
    if (!keyword) return 'https://map.naver.com/p'
    return `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`
  }

  // 초기화
  useEffect(() => {
    if (schedule) {
      const startDate = new Date(schedule.start_date)
      const endDate = new Date(schedule.end_date)
      
      setFormData({
        title: schedule.title,
        schedule_type: schedule.schedule_type,
        description: schedule.description || '',
        date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        all_day: schedule.all_day,
        client_id: schedule.client_id || '',
        location: schedule.location || '',
        contact_name: schedule.contact_name || '',
        contact_phone: schedule.contact_phone || '',
      })
      setChecklist(schedule.checklist || [])
      
      if (schedule.clients) {
        setClientSearch(schedule.clients.company_name)
      }
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }))
      // 기본 체크리스트 설정
      const defaultItems = DEFAULT_CHECKLIST.meeting.map((text, idx) => ({
        id: `default-${idx}`,
        text,
        checked: false,
      }))
      setChecklist(defaultItems)
    }
  }, [schedule, selectedDate])

  // 일정 유형 변경 시 기본 체크리스트 업데이트
  const handleTypeChange = (type: ScheduleType) => {
    setFormData(prev => ({ ...prev, schedule_type: type }))
    
    if (!isEdit) {
      const defaultItems = DEFAULT_CHECKLIST[type].map((text, idx) => ({
        id: `default-${idx}`,
        text,
        checked: false,
      }))
      setChecklist(defaultItems)
    }
  }

  // 고객사 선택
  const handleClientSelect = (client: typeof clients[0]) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      contact_name: client.contacts.find(c => c.is_primary)?.name || client.contacts[0]?.name || '',
      contact_phone: client.contacts.find(c => c.is_primary)?.phone || client.contacts[0]?.phone || '',
    }))
    setClientSearch(client.company_name)
    setShowClientDropdown(false)
  }

  // 고객사 선택 해제
  const handleClientClear = () => {
    setFormData(prev => ({
      ...prev,
      client_id: '',
      contact_name: '',
      contact_phone: '',
    }))
    setClientSearch('')
  }

  // 체크리스트 아이템 추가
  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return
    setChecklist(prev => [
      ...prev,
      { id: Date.now().toString(), text: newCheckItem.trim(), checked: false },
    ])
    setNewCheckItem('')
  }

  // 체크리스트 아이템 삭제
  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id))
  }

  // 체크리스트 아이템 토글
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  // 필터링된 고객사 목록
  const filteredClients = clients.filter(
    client =>
      client.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.brand_name?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // 저장
  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsLoading(true)

    const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`)
    const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`)

    const scheduleData = {
      title: formData.title,
      schedule_type: formData.schedule_type,
      description: formData.description || undefined,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      all_day: formData.all_day,
      client_id: formData.client_id || undefined,
      location: formData.location || undefined,
      contact_name: formData.contact_name || undefined,
      contact_phone: formData.contact_phone || undefined,
      checklist,
    }

    let result
    if (isEdit && schedule) {
      result = await updateSchedule(schedule.id, scheduleData)
    } else {
      result = await createSchedule(scheduleData)
    }

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
      return
    }

    onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/28 px-4 py-6 backdrop-blur-[1px]">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? '일정 수정' : '새 일정 등록'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">핵심 정보부터 빠르게 입력하고 저장하세요.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 2월 정기 미팅"
                  required
                />
              </div>

              <div>
                <Label>일정 유형</Label>
                <Select
                  value={formData.schedule_type}
                  onValueChange={(v) => handleTypeChange(v as ScheduleType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.icon} {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label>시작 시간</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>

              <div>
                <Label>종료 시간</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="relative">
              <Label>고객사 (선택)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                    if (!e.target.value) {
                      handleClientClear()
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="고객사 검색..."
                  className="pl-9"
                />
                {formData.client_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={handleClientClear}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {showClientDropdown && clientSearch && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="cursor-pointer px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="text-sm font-medium text-slate-800">{client.company_name}</div>
                        {client.brand_name && (
                          <div className="text-xs text-slate-500">{client.brand_name}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>장소/주소</Label>
                <a
                  href={getNaverSearchUrl(formData.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  네이버 지도에서 찾기
                </a>
              </div>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="예: 서울 강남구 테헤란로 123"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>담당자명</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="담당자 성함"
                />
              </div>
              <div>
                <Label>연락처</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="담당자 연락처"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div>
              <Label>메모</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="일정에 대한 메모"
                rows={3}
              />
            </div>

            <div>
              <Label>준비 체크리스트</Label>
              <div className="mt-2 space-y-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span className={`text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="체크리스트 항목 추가"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addChecklistItem()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-2 flex gap-2 border-t border-slate-200 bg-white px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? '저장 중...' : isEdit ? '수정' : '등록'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
