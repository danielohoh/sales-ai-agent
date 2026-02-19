'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { X, MapPin, User, Phone, Clock, Building2, Edit, Trash2, CheckCircle, History, Mic, Square, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SCHEDULE_TYPES, SCHEDULE_STATUS } from '@/lib/constants'
import { completeSchedule, createRemindersFromAiChecklist, deleteSchedule, executeAiScheduleActions, getClientMeetingHistory } from '@/app/schedules/actions'
import type { ScheduleWithClient, ScheduleType, Schedule } from '@/types'

interface ScheduleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onSuccess: () => void
  schedule: ScheduleWithClient | null
}

interface AISummaryResult {
  clientRequests: string[]
  internalChecks: string[]
  aiActions: {
    type: 'create_followup_schedule' | 'create_reminder'
    title: string
    days_from_now?: number
    d_day?: number
    description?: string
  }[]
  userChecklist: { text: string; d_day: number }[]
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: { length: number; [key: number]: { [key: number]: { transcript: string } } } }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function ScheduleDetailModal({
  isOpen,
  onClose,
  onEdit,
  onSuccess,
  schedule,
}: ScheduleDetailModalProps) {
  const [meetingNotes, setMeetingNotes] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [meetingHistory, setMeetingHistory] = useState<Schedule[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isExecutingAi, setIsExecutingAi] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [aiSummary, setAiSummary] = useState<AISummaryResult | null>(null)
  const [aiExecutedSummary, setAiExecutedSummary] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<InstanceType<SpeechRecognitionCtor> | null>(null)
  const [workflowStep, setWorkflowStep] = useState<'none' | 'ai_actions' | 'user_tasks'>('none')
  const [selectedAiActions, setSelectedAiActions] = useState<number[]>([])
  const [selectedUserTasks, setSelectedUserTasks] = useState<number[]>([])

  useEffect(() => {
    if (schedule?.meeting_notes) {
      setMeetingNotes(schedule.meeting_notes)
    } else {
      setMeetingNotes('')
    }
    setShowHistory(false)
    setMeetingHistory([])
    setLiveTranscript('')
    setAiSummary(null)
    setAiExecutedSummary(null)
    setRecordingError(null)
    setIsRecording(false)
    setWorkflowStep('none')
    setSelectedAiActions([])
    setSelectedUserTasks([])
  }, [schedule])

  const getNaverLinks = (address: string) => {
    const encoded = encodeURIComponent(address)
    return {
      app: `nmap://search?query=${encoded}&appname=com.msbenter.salesagent`,
      web: `https://map.naver.com/p/search/${encoded}`,
    }
  }

  const normalizeSummary = (parsed: Partial<AISummaryResult>): AISummaryResult => ({
    clientRequests: Array.isArray(parsed.clientRequests) ? parsed.clientRequests.slice(0, 8) : [],
    internalChecks: Array.isArray(parsed.internalChecks) ? parsed.internalChecks.slice(0, 8) : [],
    aiActions: Array.isArray(parsed.aiActions)
      ? parsed.aiActions
          .filter((a) => (a.type === 'create_followup_schedule' || a.type === 'create_reminder') && !!a.title)
          .slice(0, 6)
      : [],
    userChecklist: Array.isArray(parsed.userChecklist)
      ? parsed.userChecklist
          .filter((c) => !!c.text)
          .map((c, idx) => ({ text: c.text, d_day: Number.isFinite(c.d_day) ? c.d_day : idx + 1 }))
          .slice(0, 10)
      : [],
  })

  const extractJsonBlock = (text: string): string | null => {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    return text.slice(start, end + 1)
  }

  const buildHeuristicSummary = (transcript: string): AISummaryResult => {
    const text = transcript.trim()
    const actions: AISummaryResult['aiActions'] = []
    const checklist: AISummaryResult['userChecklist'] = []

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dayDiffFromMonthDay = (month: number, day: number) => {
      let target = new Date(today.getFullYear(), month - 1, day)
      if (target.getTime() < todayStart.getTime()) {
        target = new Date(today.getFullYear() + 1, month - 1, day)
      }
      return Math.max(0, Math.ceil((target.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)))
    }

    const pushDatedFollowupAction = (month: number, day: number) => {
      const daysFromNow = dayDiffFromMonthDay(month, day)
      const title = /(후속\s*일정|일정)/.test(text)
        ? `${month}월 ${day}일 후속 일정`
        : `${month}월 ${day}일 미팅`
      actions.push({
        type: 'create_followup_schedule',
        title,
        days_from_now: daysFromNow,
        description: '미팅 내용 기록 기반 자동 생성 일정',
      })
    }

    const dateMeetingRegex = /(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:[^.\n]*(미팅|회의|방문|통화|콜|일정|약속))?/g
    let dateMatch = dateMeetingRegex.exec(text)
    while (dateMatch) {
      const month = Number(dateMatch[1])
      const day = Number(dateMatch[2])
      pushDatedFollowupAction(month, day)
      dateMatch = dateMeetingRegex.exec(text)
    }

    const slashDateRegex = /(\d{1,2})\s*[./-]\s*(\d{1,2})(?:[^.\n]*(미팅|회의|방문|통화|콜|일정|약속))?/g
    let slashMatch = slashDateRegex.exec(text)
    while (slashMatch) {
      const month = Number(slashMatch[1])
      const day = Number(slashMatch[2])
      pushDatedFollowupAction(month, day)
      slashMatch = slashDateRegex.exec(text)
    }

    if (/(계약서).*(보내|발송|전달)/.test(text)) {
      actions.push({ type: 'create_reminder', title: '계약서 발송', d_day: 0 })
      checklist.push({ text: '계약서 최종본 확인 후 발송', d_day: 0 })
    }

    if (/((서비스\s*소개서|소개서).*(메일|이메일).*(보내|발송|전달))|((메일|이메일).*(서비스\s*소개서|소개서).*(보내|발송|전달))/.test(text)) {
      actions.push({ type: 'create_reminder', title: '서비스 소개서 메일 발송', d_day: 0 })
      checklist.push({ text: '서비스 소개서 첨부 후 메일 발송', d_day: 0 })
    }

    const uniqActions = Array.from(
      new Map(actions.map((item) => [`${item.type}:${item.title}`, item])).values()
    )
    const uniqChecklist = Array.from(
      new Map(checklist.map((item) => [item.text, item])).values()
    )

    return {
      clientRequests: [],
      internalChecks: [],
      aiActions: uniqActions.slice(0, 6),
      userChecklist: uniqChecklist.slice(0, 10),
    }
  }

  const mergeSummary = (base: AISummaryResult, fallback: AISummaryResult): AISummaryResult => {
    const aiActions = Array.from(
      new Map([...base.aiActions, ...fallback.aiActions].map((item) => [`${item.type}:${item.title}`, item])).values()
    ).slice(0, 6)
    const userChecklist = Array.from(
      new Map([...base.userChecklist, ...fallback.userChecklist].map((item) => [item.text, item])).values()
    ).slice(0, 10)

    return {
      clientRequests: base.clientRequests.length > 0 ? base.clientRequests : fallback.clientRequests,
      internalChecks: base.internalChecks.length > 0 ? base.internalChecks : fallback.internalChecks,
      aiActions,
      userChecklist,
    }
  }

  const parseJsonResponse = (raw: unknown): AISummaryResult | null => {
    try {
      if (raw && typeof raw === 'object') {
        return normalizeSummary(raw as Partial<AISummaryResult>)
      }

      const text = typeof raw === 'string' ? raw : ''
      const cleaned = text.replace(/```json|```/g, '').trim()

      try {
        return normalizeSummary(JSON.parse(cleaned) as Partial<AISummaryResult>)
      } catch {
        const jsonBlock = extractJsonBlock(cleaned)
        if (!jsonBlock) return null
        return normalizeSummary(JSON.parse(jsonBlock) as Partial<AISummaryResult>)
      }
    } catch {
      return null
    }
  }

  const summarizeTranscript = async (transcript: string) => {
    if (!transcript.trim()) return null
    setIsSummarizing(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: schedule?.user_id,
          files: [],
          messages: [
            {
              role: 'user',
              content: `다음은 영업 미팅 음성 기록 텍스트다. 아래 JSON 스키마만 반환해줘. 다른 설명은 금지한다.\n\n스키마:\n{\n  "clientRequests": string[],\n  "internalChecks": string[],\n  "aiActions": [{"type":"create_followup_schedule|create_reminder","title":string,"days_from_now"?:number,"d_day"?:number,"description"?:string}],\n  "userChecklist": [{"text": string, "d_day": number}]\n}\n\n요구사항:\n- 거래처 요청사항은 clientRequests\n- 내부 확인사항은 internalChecks\n- 시스템이 바로 실행 가능한 작업은 aiActions\n- 사람이 해야 할 후속 업무는 userChecklist로 정리\n- d_day는 오늘 기준 남은 일수 (오늘=0)\n\n미팅 기록:\n${transcript}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error('요약 API 호출 실패')
      }

      const data = await response.json()
      const heuristic = buildHeuristicSummary(transcript)
      const parsed = parseJsonResponse(data?.content)
      const resolved = parsed ? mergeSummary(parsed, heuristic) : heuristic

      setAiSummary(resolved)
      const merged = [
        transcript.trim(),
        '',
        '[AI 요약]',
        ...(resolved.clientRequests.length > 0 ? ['거래처 요청사항:', ...resolved.clientRequests.map((item) => `- ${item}`), ''] : []),
        ...(resolved.internalChecks.length > 0 ? ['내부 확인사항:', ...resolved.internalChecks.map((item) => `- ${item}`), ''] : []),
      ].join('\n')
      setMeetingNotes(merged.trim())
      return resolved
    } catch (error) {
      console.error(error)
      alert('AI 요약에 실패했습니다. 미팅 내용은 그대로 유지되었습니다.')
      return null
    } finally {
      setIsSummarizing(false)
    }
  }

  const startRecording = () => {
    if (typeof window === 'undefined') return
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!Recognition) {
      setRecordingError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 사용을 권장합니다.')
      return
    }

    setRecordingError(null)
    const recognitionInstance = new Recognition()
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    recognitionInstance.lang = 'ko-KR'

    recognitionInstance.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setLiveTranscript(transcript)
    }

    recognitionInstance.onerror = (event) => {
      setRecordingError(`음성 인식 오류: ${event.error}`)
      setIsRecording(false)
    }

    recognitionInstance.onend = () => {
      setIsRecording(false)
    }

    recognitionInstance.start()
    setRecognition(recognitionInstance)
    setIsRecording(true)
  }

  const stopRecordingAndSummarize = async () => {
    recognition?.stop()
    setRecognition(null)
    const transcript = liveTranscript.trim()
    if (transcript) {
      await summarizeTranscript(transcript)
    }
  }

  const buildFinalNote = (selectedUserItems: { text: string; d_day: number }[]) => {
    if (!aiSummary) return meetingNotes
    const checklistLines = selectedUserItems.map((item) => `- [ ] ${item.text} (D-${item.d_day})`)
    return [meetingNotes.trim(), '', '[후속 체크리스트]', ...checklistLines].join('\n').trim()
  }

  const buildMergedChecklist = (selectedUserItems: { text: string; d_day: number }[]) => {
    const base = [...(schedule?.checklist || [])]
    if (!aiSummary || selectedUserItems.length === 0) return base

    const existingTexts = new Set(base.map((item) => item.text.trim()))
    for (const item of selectedUserItems) {
      if (existingTexts.has(item.text.trim())) continue
      base.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: item.text,
        checked: false,
        d_day: item.d_day,
        due_date: new Date(Date.now() + item.d_day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
    }
    return base
  }

  const handleStartAiWorkflow = async () => {
    if (!schedule) return
    if (!meetingNotes.trim()) {
      alert('미팅 내용 기록을 먼저 입력해주세요.')
      return
    }

    let summary = aiSummary
    if (!summary) {
      summary = await summarizeTranscript(meetingNotes)
      if (!summary) return
    }

    setSelectedAiActions(summary.aiActions.map((_, index) => index))
    setSelectedUserTasks(summary.userChecklist.map((_, index) => index))
    setWorkflowStep('ai_actions')
  }

  const handleExecuteSelectedAiActions = async () => {
    if (!schedule || !aiSummary) return

    const aiActionList = aiSummary.aiActions.filter((_, index) => selectedAiActions.includes(index))
    setIsExecutingAi(true)

    if (aiActionList.length > 0) {
      const execResult = await executeAiScheduleActions(schedule.id, aiActionList)
      if (execResult.error) {
        setIsExecutingAi(false)
        alert(execResult.error)
        return
      }

      const executed = execResult.data || []
      setAiExecutedSummary(`${executed.length}개 작업을 시스템에서 자동 처리했습니다.`)
    } else {
      setAiExecutedSummary('선택된 AI 자동 처리 작업이 없습니다.')
    }

    setIsExecutingAi(false)
    setWorkflowStep('user_tasks')
  }

  const handleConfirmUserTasksAndComplete = async () => {
    if (!schedule || !aiSummary) return

    const selectedUserItems = aiSummary.userChecklist.filter((_, index) => selectedUserTasks.includes(index))

    if (selectedUserItems.length > 0) {
      const reminderResult = await createRemindersFromAiChecklist(schedule.id, selectedUserItems)
      if (reminderResult.error) {
        alert(reminderResult.error)
        return
      }
    }

    setIsCompleting(true)
    const finalMeetingNote = buildFinalNote(selectedUserItems)
    const result = await completeSchedule(schedule.id, finalMeetingNote, buildMergedChecklist(selectedUserItems))
    setIsCompleting(false)

    if (result.error) {
      alert(result.error)
      return
    }

    onSuccess()
    onClose()
  }

  const toggleAiAction = (index: number) => {
    setSelectedAiActions((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    )
  }

  const toggleUserTask = (index: number) => {
    setSelectedUserTasks((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    )
  }

  // 미팅 히스토리 로드
  const loadMeetingHistory = async () => {
    if (!schedule?.client_id) return
    
    setLoadingHistory(true)
    const result = await getClientMeetingHistory(schedule.client_id)
    if (result.data) {
      setMeetingHistory(result.data.filter(h => h.id !== schedule.id))
    }
    setLoadingHistory(false)
    setShowHistory(true)
  }

  // 삭제
  const handleDelete = async () => {
    if (!schedule) return
    if (!confirm('이 일정을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteSchedule(schedule.id)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
      return
    }

    onSuccess()
    onClose()
  }

  if (!isOpen || !schedule) return null

  const typeInfo = SCHEDULE_TYPES[schedule.schedule_type as ScheduleType]
  const statusInfo = SCHEDULE_STATUS[schedule.status]
  const startDate = parseISO(schedule.start_date)
  const endDate = parseISO(schedule.end_date)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className={`p-4 border-b ${typeInfo.bgColor}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{typeInfo.icon}</span>
                <Badge variant="outline" className={typeInfo.color}>
                  {typeInfo.label}
                </Badge>
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold">{schedule.title}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 일시 */}
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-5 w-5" />
            <div>
              <div className="font-medium">
                {format(startDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </div>
              <div className="text-sm">
                {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
              </div>
            </div>
          </div>

          {/* 고객사 */}
          {schedule.clients && (
            <div className="flex items-center gap-3 text-gray-600">
              <Building2 className="h-5 w-5" />
              <div>
                <div className="font-medium">{schedule.clients.company_name}</div>
                {schedule.clients.brand_name && (
                  <div className="text-sm text-gray-500">{schedule.clients.brand_name}</div>
                )}
              </div>
            </div>
          )}

          {/* 장소 */}
          {schedule.location && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-5 w-5" />
              <a
                href={getNaverLinks(schedule.location).web}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                onClick={(e) => {
                  if (typeof window !== 'undefined') {
                    const appLink = getNaverLinks(schedule.location as string).app
                    window.location.href = appLink
                    setTimeout(() => {
                      window.open(getNaverLinks(schedule.location as string).web, '_blank', 'noopener,noreferrer')
                    }, 600)
                    e.preventDefault()
                  }
                }}
              >
                {schedule.location}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* 담당자 */}
          {schedule.contact_name && (
            <div className="flex items-center gap-3 text-gray-600">
              <User className="h-5 w-5" />
              <span>{schedule.contact_name}</span>
            </div>
          )}

          {/* 연락처 */}
          {schedule.contact_phone && (
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="h-5 w-5" />
              <a href={`tel:${schedule.contact_phone}`} className="text-blue-600 hover:underline">
                {schedule.contact_phone}
              </a>
            </div>
          )}

          {/* 메모 */}
          {schedule.description && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">메모</div>
              <div className="text-gray-600 whitespace-pre-wrap">{schedule.description}</div>
            </div>
          )}

          {/* 체크리스트 */}
          {schedule.checklist && schedule.checklist.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">준비 체크리스트</div>
              <div className="space-y-1">
                {schedule.checklist.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                    <span>{item.checked ? '✅' : '⬜'}</span>
                    <span className={item.checked ? 'line-through text-gray-400' : ''}>
                      {item.text}
                    </span>
                    </div>
                    {(typeof item.d_day === 'number' || item.due_date) && (
                      <Badge variant="outline" className="text-xs">
                        {typeof item.d_day === 'number'
                          ? `D-${Math.max(0, item.d_day)}`
                          : `D-${Math.max(0, Math.ceil((new Date(item.due_date as string).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))}`}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 미팅 히스토리 (고객사가 있을 때만) */}
          {schedule.clients && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMeetingHistory}
                disabled={loadingHistory}
              >
                <History className="h-4 w-4 mr-1" />
                이 고객 이전 미팅 보기
              </Button>

              {showHistory && (
                <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-2">이전 미팅 기록</div>
                  {meetingHistory.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {meetingHistory.map(h => (
                        <div key={h.id} className="text-sm bg-white p-2 rounded">
                          <div className="font-medium">
                            {format(parseISO(h.start_date), 'yyyy.MM.dd')} - {h.title}
                          </div>
                          {h.meeting_notes && (
                            <div className="text-gray-600 text-xs mt-1 line-clamp-2">
                              {h.meeting_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">이전 미팅 기록이 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 미팅 내용 입력 (예정 상태일 때) */}
          {schedule.status === 'scheduled' && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">미팅 내용 기록</div>

              <div className="mb-2 flex flex-wrap gap-2">
                {!isRecording ? (
                  <Button type="button" variant="outline" onClick={startRecording} disabled={isSummarizing}>
                    <Mic className="h-4 w-4 mr-2" />
                    미팅 녹음 시작
                  </Button>
                ) : (
                  <Button type="button" variant="destructive" onClick={stopRecordingAndSummarize} disabled={isSummarizing}>
                    <Square className="h-4 w-4 mr-2" />
                    녹음 종료 + AI 요약
                  </Button>
                )}
                {isSummarizing && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI 요약 중
                  </Badge>
                )}
              </div>

              {recordingError && (
                <div className="mb-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{recordingError}</div>
              )}

              {liveTranscript && (
                <div className="mb-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="mb-1 text-xs font-semibold text-slate-500">실시간 녹음 텍스트</div>
                  {liveTranscript}
                </div>
              )}

              <Textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="미팅에서 논의한 내용, 결과, 다음 단계 등을 기록하세요..."
                rows={4}
              />

              {aiSummary && workflowStep === 'none' && (
                <div className="mt-3 space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Sparkles className="h-4 w-4" />
                    AI 요약 결과
                  </div>

                  {aiSummary.clientRequests.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600">거래처 요청 사항</div>
                      <ul className="mt-1 space-y-1 text-sm text-slate-700">
                        {aiSummary.clientRequests.map((item, idx) => (
                          <li key={`${item}-${idx}`}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSummary.internalChecks.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600">내부 확인 사항</div>
                      <ul className="mt-1 space-y-1 text-sm text-slate-700">
                        {aiSummary.internalChecks.map((item, idx) => (
                          <li key={`${item}-${idx}`}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSummary.aiActions.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600">AI 즉시 처리 가능</div>
                      <ul className="mt-1 space-y-1 text-sm text-slate-700">
                        {aiSummary.aiActions.map((action, idx) => (
                          <li key={`${action.title}-${idx}`}>- {action.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSummary.userChecklist.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600">직접 실행 체크리스트</div>
                      <ul className="mt-1 space-y-1.5 text-sm text-slate-700">
                        {aiSummary.userChecklist.map((item, idx) => (
                          <li key={`${item.text}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
                            <span>{item.text}</span>
                            <Badge variant="outline">D-{item.d_day}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {aiExecutedSummary && (
                <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">
                  {aiExecutedSummary}
                </div>
              )}

              {workflowStep === 'none' && (
                <Button
                  onClick={handleStartAiWorkflow}
                  disabled={isCompleting || isSummarizing || isExecutingAi}
                  className="mt-2 w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isSummarizing ? 'AI 분석 중...' : '완료 처리 + AI 업무 반영'}
                </Button>
              )}

              {workflowStep === 'ai_actions' && aiSummary && (
                <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                  <div className="text-sm font-semibold text-blue-700">1단계: AI가 즉시 실행 가능한 업무</div>
                  <div className="space-y-2">
                    {aiSummary.aiActions.length > 0 ? (
                      aiSummary.aiActions.map((action, index) => (
                        <label key={`${action.title}-${index}`} className="flex items-start gap-2 rounded-lg bg-white p-2">
                          <Checkbox
                            checked={selectedAiActions.includes(index)}
                            onCheckedChange={() => toggleAiAction(index)}
                            className="mt-0.5"
                          />
                          <span className="text-sm text-slate-700">{action.title}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">AI가 즉시 실행할 항목이 없습니다. 다음 단계로 넘어가세요.</p>
                    )}
                  </div>
                  <Button onClick={handleExecuteSelectedAiActions} disabled={isExecutingAi} className="w-full">
                    {isExecutingAi ? '실행 중...' : '선택한 항목 실행'}
                  </Button>
                </div>
              )}

              {workflowStep === 'user_tasks' && aiSummary && (
                <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-700">2단계: 내가 진행할 할일 선택</div>
                  <div className="space-y-2">
                    {aiSummary.userChecklist.length > 0 ? (
                      aiSummary.userChecklist.map((item, index) => (
                        <label key={`${item.text}-${index}`} className="flex items-start justify-between gap-2 rounded-lg bg-white p-2">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={selectedUserTasks.includes(index)}
                              onCheckedChange={() => toggleUserTask(index)}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-slate-700">{item.text}</span>
                          </div>
                          <Badge variant="outline">D-{item.d_day}</Badge>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">추가할 사용자 할일이 없습니다.</p>
                    )}
                  </div>
                  <Button onClick={handleConfirmUserTasksAndComplete} disabled={isCompleting} className="w-full">
                    {isCompleting ? '저장 중...' : '확인 (선택 항목만 할일 추가 후 완료처리)'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 완료된 일정의 미팅 내용 */}
          {schedule.status === 'completed' && schedule.meeting_notes && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1 text-green-700">미팅 내용</div>
              <div className="text-gray-700 whitespace-pre-wrap">{schedule.meeting_notes}</div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            {schedule.status === 'scheduled' && (
              <>
                <Button variant="outline" onClick={onEdit} className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {schedule.status === 'completed' && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                닫기
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
