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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

interface MessageLogModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
  type: 'kakao' | 'sms'
}

export function MessageLogModal({ open, onClose, clientId, clientName, type }: MessageLogModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [setReminder, setSetReminder] = useState(false)

  const typeLabel = type === 'kakao' ? '카카오톡' : '문자'

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('내용을 입력해주세요.')
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
      activity_type: type,
      description,
      next_action: setReminder ? nextAction : null,
      next_action_date: setReminder ? nextActionDate : null,
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
    if (setReminder && nextAction && nextActionDate) {
      await supabase.from('reminders').insert({
        client_id: clientId,
        user_id: user.id,
        reminder_type: 'custom',
        message: nextAction,
        due_date: nextActionDate,
      })
    }

    router.refresh()
    handleClose()
    setIsLoading(false)
  }

  const handleClose = () => {
    setDescription('')
    setNextAction('')
    setNextActionDate('')
    setSetReminder(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{typeLabel} 기록 추가</DialogTitle>
          <DialogDescription>
            {clientName}에게 보낸 {typeLabel} 내용을 기록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{typeLabel} 내용 *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`보낸 ${typeLabel} 내용을 요약해주세요...`}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="set-reminder"
              checked={setReminder}
              onCheckedChange={(checked) => setSetReminder(checked as boolean)}
            />
            <Label htmlFor="set-reminder" className="cursor-pointer">
              다음 액션 리마인더 설정
            </Label>
          </div>

          {setReminder && (
            <>
              <div className="space-y-2">
                <Label>다음 액션</Label>
                <Input
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="예: 응답 확인, 후속 연락"
                />
              </div>

              <div className="space-y-2">
                <Label>예정일</Label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
