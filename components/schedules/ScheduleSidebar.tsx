'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Search, X, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAvailableSlots } from '@/app/schedules/actions'

interface ScheduleSidebarProps {
  clients: {
    id: string
    company_name: string
    brand_name: string | null
  }[]
  selectedClientId: string | null
  onClientSelect: (clientId: string | null) => void
  selectedDate: Date | null
  onTimeSlotClick: (time: string) => void
}

export function ScheduleSidebar({
  clients,
  selectedClientId,
  onClientSelect,
  selectedDate,
  onTimeSlotClick,
}: ScheduleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // 선택된 날짜의 빈 시간대 조회
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!selectedDate) {
        setAvailableSlots([])
        return
      }

      setLoadingSlots(true)
      const result = await getAvailableSlots(format(selectedDate, 'yyyy-MM-dd'))
      if (result.data) {
        setAvailableSlots(result.data)
      }
      setLoadingSlots(false)
    }

    loadAvailableSlots()
  }, [selectedDate])

  // 필터링된 고객사
  const filteredClients = clients.filter(
    client =>
      client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 선택된 고객사 정보
  const selectedClient = selectedClientId
    ? clients.find(c => c.id === selectedClientId)
    : null

  return (
    <div className="space-y-4">
      {/* 고객사 필터 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" />
          고객사 필터
        </h3>

        {selectedClient ? (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded-xl">
            <div>
              <div className="font-medium text-sm">{selectedClient.company_name}</div>
              {selectedClient.brand_name && (
                <div className="text-xs text-gray-500">{selectedClient.brand_name}</div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onClientSelect(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="고객사 검색..."
              className="mb-2"
            />
            
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredClients.length > 0 ? (
                  filteredClients.slice(0, 10).map(client => (
                    <div
                      key={client.id}
                      onClick={() => {
                        onClientSelect(client.id)
                        setSearchQuery('')
                      }}
                      className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <div className="text-sm font-medium">{client.company_name}</div>
                      {client.brand_name && (
                        <div className="text-xs text-gray-500">{client.brand_name}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">검색 결과가 없습니다</div>
                )}
              </div>
            )}

            {!searchQuery && (
              <div className="text-sm text-gray-500">
                고객사를 검색하여 해당 고객 일정만 볼 수 있습니다
              </div>
            )}
          </>
        )}
      </div>

      {/* 빈 시간대 추천 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          빈 시간대
        </h3>

        {selectedDate ? (
          <>
            <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
            </div>

            {loadingSlots ? (
              <div className="text-sm text-gray-500">로딩 중...</div>
            ) : availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map(slot => (
                  <Badge
                    key={slot}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => onTimeSlotClick(slot)}
                  >
                    {slot}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                이 날은 모든 시간이 예약되어 있습니다
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500">
            캘린더에서 날짜를 클릭하면 빈 시간대를 확인할 수 있습니다
          </div>
        )}
      </div>

      {/* 일정 유형 안내 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold mb-3">일정 유형</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100" />
            <span>🤝 미팅</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span>📞 전화</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-100" />
            <span>💻 데모</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100" />
            <span>📝 계약</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <span>👥 내부회의</span>
          </div>
        </div>
      </div>
    </div>
  )
}
