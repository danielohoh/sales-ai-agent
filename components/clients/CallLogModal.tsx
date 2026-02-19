'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

interface CallLogModalProps {
  clientId: string
  onClose: () => void
}

export function CallLogModal({ clientId, onClose }: CallLogModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const [callDuration, setCallDuration] = useState('')
  const [description, setDescription] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('통화 내용을 입력해주세요.')
      return
    }

    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('인증이 필요합니다.')
      setIsLoading(false)
      return
    }

    // 활동 로그 추가
    const { error: logError } = await supabase.from('activity_logs').insert({
      client_id: clientId,
      user_id: user.id,
      activity_type: 'call',
      description,
      call_duration: callDuration ? parseInt(callDuration) : null,
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
    })

    if (logError) {
      alert(`저장 실패: ${logError.message}`)
      setIsLoading(false)
      return
    }

    // 마지막 연락일 업데이트
    await supabase
      .from('clients')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', clientId)

    // 다음 액션이 있으면 리마인더 추가
    if (nextAction && nextActionDate) {
      await supabase.from('reminders').insert({
        client_id: clientId,
        user_id: user.id,
        reminder_type: 'custom',
        message: nextAction,
        due_date: nextActionDate,
      })
    }

    router.refresh()
    onClose()
    setIsLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>통화 기록 추가</DialogTitle>
          <DialogDescription>
            고객과의 통화 내용을 기록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">통화 시간 (분)</Label>
            <Input
              id="duration"
              type="number"
              value={callDuration}
              onChange={(e) => setCallDuration(e.target.value)}
              placeholder="예: 15"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">통화 내용 *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="통화 내용을 입력하세요..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextAction">다음 액션</Label>
            <Input
              id="nextAction"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="예: 미팅 일정 확정, 견적서 발송"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextActionDate">다음 액션 예정일</Label>
            <Input
              id="nextActionDate"
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
