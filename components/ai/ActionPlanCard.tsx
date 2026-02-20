'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, X, Edit3, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { ActionPlan, ActionPlanResult } from '@/types/action-plan'

type CardStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'executed' | 'failed'

interface ActionPlanCardProps {
  plan: ActionPlan
  onApprove: (plan: ActionPlan, modifications?: Record<string, unknown>) => void
  onReject: (planId: string) => void
  status: CardStatus
  result?: ActionPlanResult
}

const INTENT_LABELS: Record<string, { icon: string; label: string }> = {
  create_client: { icon: '👤', label: '고객 등록' },
  update_client: { icon: '✏️', label: '고객 수정' },
  add_contact: { icon: '👥', label: '연락처 추가' },
  log_activity: { icon: '📝', label: '활동 기록' },
  move_pipeline: { icon: '📊', label: '단계 변경' },
  create_schedule: { icon: '📅', label: '일정 등록' },
  update_schedule: { icon: '📅', label: '일정 수정' },
  create_reminder: { icon: '⏰', label: '리마인더 생성' },
  draft_email: { icon: '📧', label: '이메일 초안' },
  send_email: { icon: '📨', label: '이메일 발송' },
  create_proposal: { icon: '📄', label: '제안서 생성' },
  delete_client: { icon: '🗑️', label: '고객 삭제' },
  delete_schedule: { icon: '🗑️', label: '일정 삭제' },
}

const FIELD_LABELS: Record<string, string> = {
  company_name: '회사명',
  brand_name: '브랜드명',
  contact_name: '담당자',
  contact_phone: '전화번호',
  contact_email: '이메일',
  activity_type: '활동유형',
  description: '내용',
  client_name: '고객사',
  new_stage: '변경단계',
  title: '제목',
  date: '날짜',
  start_time: '시작시간',
  end_time: '종료시간',
  location: '장소',
  schedule_type: '일정유형',
  ceo_name: '대표자',
  industry: '업종',
  notes: '메모',
  name: '이름',
  position: '직책',
  email: '이메일',
  phone: '전화번호',
  inquiry_source: '문의경로',
  interest_product: '관심제품',
  failure_reason: '실패사유',
  failure_category: '실패분류',
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: '통화', email_sent: '이메일', kakao: '카카오톡', sms: '문자', meeting: '미팅', note: '메모',
}

const STAGE_LABELS: Record<string, string> = {
  inquiry: '문의접수', called: '전화완료', email_sent: '메일전송', meeting: '미팅',
  meeting_followup: '미팅후메일', reviewing: '검토중', in_progress: '계약진행중',
  completed: '계약완료', failed: '실패', on_hold: '보류',
}

const RISK_LABELS: Record<string, string> = {
  duplicate_client: '유사 고객이 존재합니다',
  unknown_stage: '알 수 없는 단계입니다',
  missing_date: '날짜 정보가 없습니다',
  send_email_risk: '이메일이 실제 발송됩니다',
  delete_risk: '삭제된 데이터는 복구할 수 없습니다',
  high_value_change: '중요 데이터가 변경됩니다',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value)
  if (key === 'activity_type') return ACTIVITY_LABELS[str] || str
  if (key === 'new_stage' || key === 'pipeline_stage') return STAGE_LABELS[str] || str
  return str
}

const STATUS_STYLES: Record<CardStatus, string> = {
  pending: 'border-blue-200 bg-blue-50/50',
  approved: 'border-blue-200 bg-blue-50/50',
  executing: 'border-yellow-200 bg-yellow-50/50',
  executed: 'border-green-200 bg-green-50/50',
  failed: 'border-red-200 bg-red-50/50',
  rejected: 'border-slate-200 bg-slate-50/50',
}

export function ActionPlanCard({ plan, onApprove, onReject, status, result }: ActionPlanCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showDetails, setShowDetails] = useState(false)

  const intentInfo = INTENT_LABELS[plan.intent] || { icon: '🔧', label: '작업 실행' }

  const visibleEntities = Object.entries(plan.entities).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  )

  const handleEditToggle = () => {
    if (!isEditing) {
      const initial: Record<string, string> = {}
      for (const [k, v] of visibleEntities) {
        initial[k] = String(v)
      }
      setEditValues(initial)
    }
    setIsEditing(!isEditing)
  }

  const handleApproveClick = () => {
    if (isEditing && Object.keys(editValues).length > 0) {
      const mods: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(editValues)) {
        if (String(plan.entities[k]) !== v) {
          mods[k] = v
        }
      }
      onApprove(plan, Object.keys(mods).length > 0 ? mods : undefined)
    } else {
      onApprove(plan)
    }
  }

  return (
    <div className={cn('rounded-xl border p-3 transition-colors', STATUS_STYLES[status])}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{intentInfo.icon}</span>
          <span className="text-sm font-semibold text-slate-800">{intentInfo.label}</span>
        </div>
        {status === 'executing' && (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            실행 중...
          </div>
        )}
        {status === 'executed' && (
          <Badge variant="outline" className="text-green-600 border-green-300 text-xs gap-1">
            <Check className="h-3 w-3" /> 완료
          </Badge>
        )}
        {status === 'failed' && (
          <Badge variant="outline" className="text-red-600 border-red-300 text-xs gap-1">
            <X className="h-3 w-3" /> 실패
          </Badge>
        )}
        {status === 'rejected' && (
          <Badge variant="outline" className="text-slate-500 border-slate-300 text-xs">취소됨</Badge>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 mb-3">
          {visibleEntities.map(([key]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16 shrink-0 text-right">
                {FIELD_LABELS[key] || key}
              </label>
              <Input
                value={editValues[key] || ''}
                onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
          {visibleEntities.map(([key, value]) => {
            const formatted = formatValue(key, value)
            if (!formatted) return null
            return (
              <div key={key} className="flex items-baseline gap-1 min-w-0">
                <span className="text-xs text-slate-400 shrink-0">{FIELD_LABELS[key] || key}</span>
                <span className="text-xs text-slate-700 font-medium truncate">{formatted}</span>
              </div>
            )
          })}
        </div>
      )}

      {plan.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {plan.risk_flags.map((flag) => (
            <div key={flag} className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
              <AlertTriangle className="h-3 w-3" />
              {RISK_LABELS[flag] || flag}
            </div>
          ))}
        </div>
      )}

      {plan.duplicate_candidates && plan.duplicate_candidates.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            유사 고객 {plan.duplicate_candidates.length}건
          </button>
          {showDetails && (
            <div className="mt-1 space-y-1">
              {plan.duplicate_candidates.map((dup) => (
                <div key={dup.id} className="text-xs text-slate-600 bg-white/60 rounded px-2 py-1">
                  {dup.company_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(status === 'executed' || status === 'failed') && result && (
        <div className={cn(
          'text-xs rounded px-2 py-1.5 mb-2',
          status === 'executed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {result.message}
        </div>
      )}

      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
          <Button size="sm" className="h-7 text-xs px-3" onClick={handleApproveClick}>
            <Check className="h-3 w-3 mr-1" />
            {isEditing ? '적용 후 확인' : '확인'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={handleEditToggle}>
            <Edit3 className="h-3 w-3 mr-1" />
            {isEditing ? '취소' : '수정'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-3 text-red-500 hover:text-red-700"
            onClick={() => onReject(plan.plan_id)}
          >
            취소
          </Button>
        </div>
      )}
    </div>
  )
}
