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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PIPELINE_STAGES, FAILURE_CATEGORIES } from '@/lib/constants'
import { updatePipelineStage } from '@/app/clients/actions'
import type { PipelineStage, FailureCategory } from '@/types'

interface StageChangeModalProps {
  clientId: string
  currentStage: PipelineStage
  onClose: () => void
}

export function StageChangeModal({ clientId, currentStage, onClose }: StageChangeModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [stage, setStage] = useState<PipelineStage>(currentStage)
  const [failureReason, setFailureReason] = useState('')
  const [failureCategory, setFailureCategory] = useState<FailureCategory | ''>('')

  const handleSubmit = async () => {
    setIsLoading(true)

    const result = await updatePipelineStage(
      clientId,
      stage,
      stage === 'failed' ? failureReason : undefined,
      stage === 'failed' ? failureCategory : undefined
    )

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
      onClose()
    }

    setIsLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>파이프라인 단계 변경</DialogTitle>
          <DialogDescription>
            고객의 영업 단계를 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>변경할 단계</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as PipelineStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PIPELINE_STAGES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 실패인 경우 사유 입력 */}
          {stage === 'failed' && (
            <>
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '변경 중...' : '변경하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
