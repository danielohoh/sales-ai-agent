'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Phone, AlertCircle, Building2 } from 'lucide-react'
import { PIPELINE_STAGES, KANBAN_STAGES, FAILURE_CATEGORIES } from '@/lib/constants'
import { updatePipelineStage } from '@/app/clients/actions'
import type { ClientWithContacts, PipelineStage, FailureCategory } from '@/types'

interface KanbanBoardProps {
  clients: ClientWithContacts[]
}

export function KanbanBoard({ clients }: KanbanBoardProps) {
  const router = useRouter()
  const [draggedClient, setDraggedClient] = useState<string | null>(null)
  const [showFailureModal, setShowFailureModal] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ clientId: string; stage: PipelineStage } | null>(null)
  const [failureReason, setFailureReason] = useState('')
  const [failureCategory, setFailureCategory] = useState<FailureCategory | ''>('')
  const [isUpdating, setIsUpdating] = useState(false)

  // 단계별 고객 분류
  const getClientsByStage = (stage: PipelineStage) => {
    return clients.filter(client => client.pipeline_stage === stage)
  }

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    setDraggedClient(clientId)
    e.dataTransfer.effectAllowed = 'move'
  }

  // 드래그 오버
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // 드롭
  const handleDrop = async (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    
    if (!draggedClient) return

    const client = clients.find(c => c.id === draggedClient)
    if (!client || client.pipeline_stage === stage) {
      setDraggedClient(null)
      return
    }

    // 실패 단계로 이동 시 모달 표시
    if (stage === 'failed') {
      setPendingMove({ clientId: draggedClient, stage })
      setShowFailureModal(true)
      setDraggedClient(null)
      return
    }

    // 단계 변경 실행
    setIsUpdating(true)
    const result = await updatePipelineStage(draggedClient, stage)
    
    if (result.error) {
      alert(`변경 실패: ${result.error}`)
    } else {
      router.refresh()
    }
    
    setDraggedClient(null)
    setIsUpdating(false)
  }

  // 실패 사유 제출
  const handleFailureSubmit = async () => {
    if (!pendingMove) return

    setIsUpdating(true)
    const result = await updatePipelineStage(
      pendingMove.clientId,
      pendingMove.stage,
      failureReason,
      failureCategory || undefined
    )

    if (result.error) {
      alert(`변경 실패: ${result.error}`)
    } else {
      router.refresh()
    }

    setShowFailureModal(false)
    setPendingMove(null)
    setFailureReason('')
    setFailureCategory('')
    setIsUpdating(false)
  }

  // 3일 이상 미연락 체크
  const isOverdue = (client: ClientWithContacts) => {
    if (!client.last_contacted_at) return true
    const lastContact = new Date(client.last_contacted_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 3
  }

  const getPrimaryContact = (client: ClientWithContacts) => {
    return client.contacts?.find(c => c.is_primary) || client.contacts?.[0]
  }

  return (
    <div className="h-[calc(100vh-180px)]">
      {/* 칸반 컬럼들 */}
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => {
          const stageInfo = PIPELINE_STAGES[stage]
          const stageClients = getClientsByStage(stage)

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 flex flex-col bg-slate-100 rounded-lg"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* 컬럼 헤더 */}
              <div className="p-3 border-b bg-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stageInfo.color}`} />
                    <h3 className="font-medium">{stageInfo.label}</h3>
                  </div>
                  <Badge variant="secondary">{stageClients.length}</Badge>
                </div>
              </div>

              {/* 카드 목록 */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {stageClients.map((client) => {
                  const primaryContact = getPrimaryContact(client)
                  const overdue = isOverdue(client)

                  return (
                    <Card
                      key={client.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, client.id)}
                      className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedClient === client.id ? 'opacity-50' : ''
                      } ${overdue ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <Link href={`/clients/${client.id}`}>
                        <div className="space-y-2">
                          {/* 회사명 */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-sm hover:text-blue-600">
                                {client.company_name}
                              </span>
                            </div>
                            {overdue && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>

                          {/* 브랜드명 */}
                          {client.brand_name && (
                            <p className="text-xs text-slate-500 ml-6">
                              {client.brand_name}
                            </p>
                          )}

                          {/* 담당자 */}
                          {primaryContact && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Phone className="h-3 w-3" />
                              <span>{primaryContact.name}</span>
                              {primaryContact.position && (
                                <span className="text-slate-400">
                                  {primaryContact.position}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 마지막 연락일 */}
                          <div className="text-xs text-slate-400">
                            {client.last_contacted_at 
                              ? `마지막 연락: ${format(new Date(client.last_contacted_at), 'MM/dd', { locale: ko })}`
                              : '연락 기록 없음'}
                          </div>
                        </div>
                      </Link>
                    </Card>
                  )
                })}

                {stageClients.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    고객이 없습니다
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* 실패/보류 컬럼 */}
        <div className="flex-shrink-0 w-72 flex flex-col">
          {/* 실패 */}
          <div
            className="flex-1 bg-red-50 rounded-lg mb-2"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'failed')}
          >
            <div className="p-3 border-b bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h3 className="font-medium">실패</h3>
                </div>
                <Badge variant="secondary">
                  {getClientsByStage('failed').length}
                </Badge>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
              {getClientsByStage('failed').map((client) => (
                <Card key={client.id} className="p-2 bg-white">
                  <Link href={`/clients/${client.id}`}>
                    <p className="text-sm font-medium hover:text-blue-600">
                      {client.company_name}
                    </p>
                    <p className="text-xs text-red-500 truncate">
                      {client.failure_reason || '사유 없음'}
                    </p>
                  </Link>
                </Card>
              ))}
            </div>
          </div>

          {/* 보류 */}
          <div
            className="flex-1 bg-orange-50 rounded-lg"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'on_hold')}
          >
            <div className="p-3 border-b bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <h3 className="font-medium">보류</h3>
                </div>
                <Badge variant="secondary">
                  {getClientsByStage('on_hold').length}
                </Badge>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
              {getClientsByStage('on_hold').map((client) => (
                <Card key={client.id} className="p-2 bg-white">
                  <Link href={`/clients/${client.id}`}>
                    <p className="text-sm font-medium hover:text-blue-600">
                      {client.company_name}
                    </p>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 실패 사유 입력 모달 */}
      <Dialog open={showFailureModal} onOpenChange={setShowFailureModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>실패 사유 입력</DialogTitle>
            <DialogDescription>
              고객이 실패로 분류된 이유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>실패 카테고리</Label>
              <Select 
                value={failureCategory} 
                onValueChange={(v) => setFailureCategory(v as FailureCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FAILURE_CATEGORIES).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      {label} - {description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>실패 사유</Label>
              <Textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="실패 사유를 상세히 입력해주세요..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFailureModal(false)
                setPendingMove(null)
              }}
            >
              취소
            </Button>
            <Button onClick={handleFailureSubmit} disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 업데이트 중 오버레이 */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            저장 중...
          </div>
        </div>
      )}
    </div>
  )
}
