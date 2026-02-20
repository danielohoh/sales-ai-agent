import { createClient } from '@supabase/supabase-js'
import type { ActionPlan, ActionStep, ChatApiResponse } from '@/types/action-plan'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const maxDuration = 30

function buildActionPlan(params: {
  intent: ActionPlan['intent']
  entities: Record<string, unknown>
  actions: ActionStep[]
  confirmationMessage: string
  missingFields?: string[]
  riskFlags?: ActionPlan['risk_flags']
  duplicateCandidates?: ActionPlan['duplicate_candidates']
}): ActionPlan {
  return {
    plan_id: crypto.randomUUID(),
    intent: params.intent,
    confidence: 0.9,
    entities: params.entities,
    actions: params.actions,
    needs_confirmation: true,
    confirmation_message: params.confirmationMessage,
    missing_fields: params.missingFields || [],
    risk_flags: params.riskFlags || [],
    duplicate_candidates: params.duplicateCandidates,
  }
}

// 도구 실행 함수
async function executeTool(name: string, input: Record<string, unknown>, userId: string) {
  switch (name) {
    case 'searchClients': {
      const { data } = await supabase
        .from('clients')
        .select(`*, contacts(*)`)
        .or(`company_name.ilike.%${input.query}%,brand_name.ilike.%${input.query}%`)
        .eq('user_id', userId)
        .limit(10)
      return { clients: data, count: data?.length || 0 }
    }

    case 'getClientDetail': {
      // 고객사 이름으로 검색해서 상세 정보 + 활동 타임라인 조회
      const { data: clients } = await supabase
        .from('clients')
        .select(`*, contacts(*)`)
        .eq('user_id', userId)
        .ilike('company_name', `%${input.client_name}%`)
        .limit(1)

      if (!clients?.length) {
        return { error: '고객사를 찾을 수 없습니다.', client: null }
      }

      const client = clients[0]

      // 활동 타임라인 조회
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20)

      return { 
        client,
        activities: activities || [],
        activityCount: activities?.length || 0,
        message: `${client.company_name}의 정보와 최근 활동 ${activities?.length || 0}건을 조회했습니다.`
      }
    }

    case 'getClientActivities': {
      // 고객사 ID 또는 이름으로 활동 타임라인 조회
      let clientId = input.client_id as string

      // 이름으로 검색한 경우 ID 찾기
      if (input.client_name && !clientId) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('user_id', userId)
          .ilike('company_name', `%${input.client_name}%`)
          .limit(1)
        
        if (clients?.length) {
          clientId = clients[0].id
        }
      }

      if (!clientId) {
        return { error: '고객사를 찾을 수 없습니다.', activities: [] }
      }

      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(input.limit as number || 50)

      return { 
        activities: activities || [],
        count: activities?.length || 0,
        message: `총 ${activities?.length || 0}건의 활동 기록을 조회했습니다.`
      }
    }

    case 'getAllActivities': {
      // 전체 활동 로그 조회 (최근 순)
      const { data: activities } = await supabase
        .from('activity_logs')
        .select(`
          *,
          clients (
            id,
            company_name,
            brand_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(input.limit as number || 30)

      return { 
        activities: activities || [],
        count: activities?.length || 0,
        message: `최근 활동 ${activities?.length || 0}건을 조회했습니다.`
      }
    }

    case 'getClients': {
      let query = supabase
        .from('clients')
        .select(`*, contacts(*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit((input.limit as number) || 10)

      if (input.stage) {
        query = query.eq('pipeline_stage', input.stage)
      }
      const { data } = await query
      return { clients: data, count: data?.length || 0 }
    }

    case 'createClient': {
      const companyName = typeof input.company_name === 'string' ? input.company_name.trim() : ''
      const riskFlags: ActionPlan['risk_flags'] = []
      let duplicateCandidates: ActionPlan['duplicate_candidates']

      if (companyName) {
        const { data: duplicates } = await supabase
          .from('clients')
          .select('id, company_name, brand_name')
          .eq('user_id', userId)
          .or(`company_name.ilike.%${companyName}%,brand_name.ilike.%${companyName}%`)
          .limit(5)

        if (duplicates && duplicates.length > 0) {
          duplicateCandidates = duplicates.map((candidate) => ({
            id: candidate.id,
            company_name: candidate.company_name,
            similarity: candidate.brand_name || candidate.company_name,
          }))
          riskFlags.push('duplicate_client')
        }
      }

      const plan = buildActionPlan({
        intent: 'create_client',
        entities: {
          company_name: input.company_name,
          brand_name: input.brand_name,
          industry: input.industry,
          ceo_name: input.ceo_name,
          inquiry_source: input.inquiry_source,
          interest_product: input.interest_product,
          notes: input.notes,
          contact_name: input.contact_name,
          contact_phone: input.contact_phone,
          contact_email: input.contact_email,
        },
        actions: [
          {
            type: 'supabase.insert',
            table: 'clients',
            values: {
              company_name: input.company_name,
              brand_name: input.brand_name,
              industry: input.industry,
              ceo_name: input.ceo_name,
              inquiry_source: input.inquiry_source,
              interest_product: input.interest_product,
              notes: input.notes,
              pipeline_stage: 'inquiry',
            },
            result_key: 'new_client',
            notes: '고객사 신규 등록',
          },
          {
            type: 'supabase.insert',
            table: 'contacts',
            values: {
              name: input.contact_name,
              phone: input.contact_phone,
              email: input.contact_email,
              is_primary: true,
            },
            notes: '담당자 정보가 있으면 기본 담당자로 등록',
          },
          {
            type: 'supabase.insert',
            table: 'activity_logs',
            values: {
              activity_type: 'note',
              description: '신규 고객 등록',
            },
            notes: '고객 생성 이력 기록',
          },
        ],
        confirmationMessage: `${input.company_name} 고객을 등록하려고 합니다. 진행할까요?`,
        missingFields: companyName ? [] : ['company_name'],
        riskFlags,
        duplicateCandidates,
      })

      return { needsApproval: true, actionPlan: plan }
    }

    case 'addActivityLog': {
      const plan = buildActionPlan({
        intent: 'log_activity',
        entities: {
          client_name: input.client_name,
          activity_type: input.activity_type,
          description: input.description,
        },
        actions: [
          {
            type: 'supabase.insert',
            table: 'activity_logs',
            values: {
              activity_type: input.activity_type,
              description: input.description,
            },
            notes: '고객 활동 로그 생성',
          },
          {
            type: 'supabase.update',
            table: 'clients',
            values: {
              last_contacted_at: new Date().toISOString(),
            },
            notes: '최근 연락 일시 갱신',
          },
        ],
        confirmationMessage: `${input.client_name} 고객의 활동 기록을 추가하려고 합니다. 진행할까요?`,
        missingFields:
          typeof input.client_name === 'string' &&
          typeof input.activity_type === 'string' &&
          typeof input.description === 'string'
            ? []
            : ['client_name', 'activity_type', 'description'],
      })

      return { needsApproval: true, actionPlan: plan }
    }

    case 'changeStage': {
      const allowedStages = ['inquiry', 'called', 'email_sent', 'meeting', 'meeting_followup', 'reviewing', 'in_progress', 'completed', 'failed', 'on_hold']
      const riskFlags: ActionPlan['risk_flags'] = []
      if (typeof input.new_stage !== 'string' || !allowedStages.includes(input.new_stage)) {
        riskFlags.push('unknown_stage')
      }

      const plan = buildActionPlan({
        intent: 'move_pipeline',
        entities: {
          client_name: input.client_name,
          new_stage: input.new_stage,
          failure_reason: input.failure_reason,
          failure_category: input.failure_category,
        },
        actions: [
          {
            type: 'supabase.update',
            table: 'clients',
            values: {
              pipeline_stage: input.new_stage,
              failure_reason: input.failure_reason,
              failure_category: input.failure_category,
            },
            notes: '고객 파이프라인 단계 변경',
          },
          {
            type: 'supabase.insert',
            table: 'activity_logs',
            values: {
              activity_type: 'stage_change',
              description: `파이프라인 단계 변경: ${input.new_stage}`,
            },
            notes: '단계 변경 이력 기록',
          },
        ],
        confirmationMessage: `${input.client_name} 고객의 파이프라인 단계를 ${input.new_stage}(으)로 변경하려고 합니다. 진행할까요?`,
        missingFields:
          typeof input.client_name === 'string' && typeof input.new_stage === 'string'
            ? []
            : ['client_name', 'new_stage'],
        riskFlags,
      })

      return { needsApproval: true, actionPlan: plan }
    }

    case 'getStats': {
      const { data: clients } = await supabase
        .from('clients')
        .select('pipeline_stage')
        .eq('user_id', userId)

      const total = clients?.length || 0
      const completed = clients?.filter(c => c.pipeline_stage === 'completed').length || 0
      const inProgress = clients?.filter(c => !['completed', 'failed', 'on_hold'].includes(c.pipeline_stage)).length || 0
      const failed = clients?.filter(c => c.pipeline_stage === 'failed').length || 0

      if (input.type === 'pipeline') {
        const stages: Record<string, number> = {}
        clients?.forEach(c => {
          stages[c.pipeline_stage] = (stages[c.pipeline_stage] || 0) + 1
        })
        return { stages }
      }

      return { total, completed, inProgress, failed, conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
    }

    case 'getTodayTasks': {
      const today = new Date().toISOString().split('T')[0]
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

      const { data: reminders } = await supabase
        .from('reminders')
        .select(`*, clients(company_name)`)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .lte('due_date', today)

      const { data: needContact } = await supabase
        .from('clients')
        .select('id, company_name, last_contacted_at')
        .eq('user_id', userId)
        .not('pipeline_stage', 'in', '("completed","failed","on_hold")')
        .or(`last_contacted_at.is.null,last_contacted_at.lt.${threeDaysAgo}`)
        .limit(5)

      return { reminders: reminders || [], needContact: needContact || [] }
    }

    // 일정 관련 도구들
    case 'getTodaySchedules': {
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      const { data } = await supabase
        .from('schedules')
        .select(`*, clients(company_name, brand_name)`)
        .eq('user_id', userId)
        .gte('start_date', startOfDay)
        .lte('start_date', endOfDay)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })

      return { schedules: data || [], count: data?.length || 0 }
    }

    case 'getTomorrowSchedules': {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()

      const { data } = await supabase
        .from('schedules')
        .select(`*, clients(company_name, brand_name)`)
        .eq('user_id', userId)
        .gte('start_date', startOfTomorrow)
        .lte('start_date', endOfTomorrow)
        .eq('status', 'scheduled')
        .order('start_date', { ascending: true })

      return { schedules: data || [], count: data?.length || 0, message: '내일 일정입니다.' }
    }

    case 'getThisWeekSchedules': {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - dayOfWeek)
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const { data } = await supabase
        .from('schedules')
        .select(`*, clients(company_name, brand_name)`)
        .eq('user_id', userId)
        .gte('start_date', startOfWeek.toISOString())
        .lte('start_date', endOfWeek.toISOString())
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })

      // 요일별로 그룹핑
      const byDay: Record<string, typeof data> = {}
      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      
      data?.forEach(schedule => {
        const date = new Date(schedule.start_date)
        const dayName = dayNames[date.getDay()]
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${dayName})`
        if (!byDay[dateStr]) byDay[dateStr] = []
        byDay[dateStr]!.push(schedule)
      })

      return { 
        schedules: data || [], 
        byDay,
        count: data?.length || 0,
        summary: `이번 주 총 ${data?.length || 0}개의 일정이 있습니다.`
      }
    }

    case 'getAvailableSlots': {
      const targetDate = input.date as string
      const startOfDay = new Date(`${targetDate}T00:00:00`).toISOString()
      const endOfDay = new Date(`${targetDate}T23:59:59`).toISOString()

      const { data: schedules } = await supabase
        .from('schedules')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .gte('start_date', startOfDay)
        .lte('start_date', endOfDay)
        .neq('status', 'cancelled')

      // 업무 시간 (9:00 ~ 18:00)
      const workStart = 9
      const workEnd = 18
      const availableSlots: string[] = []
      
      const busySlots = schedules?.map(s => ({
        start: new Date(s.start_date).getHours(),
        end: new Date(s.end_date).getHours(),
      })) || []

      for (let hour = workStart; hour < workEnd; hour++) {
        const isBusy = busySlots.some(slot => hour >= slot.start && hour < slot.end)
        if (!isBusy) {
          availableSlots.push(`${hour.toString().padStart(2, '0')}:00`)
        }
      }

      return { 
        date: targetDate, 
        availableSlots, 
        message: availableSlots.length > 0 
          ? `${targetDate}에 가능한 시간: ${availableSlots.join(', ')}` 
          : `${targetDate}은 모든 시간이 예약되어 있습니다.`
      }
    }

    case 'createSchedule': {
      const missingFields: string[] = []
      if (typeof input.title !== 'string' || input.title.trim().length === 0) {
        missingFields.push('title')
      }
      if (typeof input.date !== 'string' || input.date.trim().length === 0) {
        missingFields.push('date')
      }

      const plan = buildActionPlan({
        intent: 'create_schedule',
        entities: {
          title: input.title,
          date: input.date,
          start_time: input.start_time || '10:00',
          end_time: input.end_time || '11:00',
          schedule_type: input.schedule_type || 'meeting',
          client_name: input.client_name,
          location: input.location,
          contact_name: input.contact_name,
          contact_phone: input.contact_phone,
          description: input.description,
        },
        actions: [
          {
            type: 'supabase.insert',
            table: 'schedules',
            values: {
              title: input.title,
              schedule_type: input.schedule_type || 'meeting',
              description: input.description,
              start_date: `${input.date}T${input.start_time || '10:00'}:00`,
              end_date: `${input.date}T${input.end_time || '11:00'}:00`,
              location: input.location,
              contact_name: input.contact_name,
              contact_phone: input.contact_phone,
            },
            notes: '신규 일정 등록',
          },
        ],
        confirmationMessage: `${input.date} ${input.start_time || '10:00'} 일정 "${input.title}"을(를) 등록하려고 합니다. 진행할까요?`,
        missingFields,
        riskFlags: typeof input.date === 'string' ? [] : ['missing_date'],
      })

      return { needsApproval: true, actionPlan: plan }
    }

    default:
      return { error: '알 수 없는 도구입니다.' }
  }
}

export async function POST(req: Request) {
  const { messages, files, userId } = await req.json()

  type IncomingMessage = { role: 'user' | 'assistant' | 'system'; content: string }
  type AttachedFile = { name: string; type: string; data: string }
  type GroqContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  type GroqToolCall = {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }
  type GroqMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content?: string | GroqContentPart[] | null
    tool_calls?: GroqToolCall[]
    tool_call_id?: string
  }

  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const buildUserContent = (text: string, attachedFiles?: AttachedFile[]): string => {
    if (!attachedFiles || attachedFiles.length === 0) {
      return text || ''
    }
    const fileNames = attachedFiles.map(f => f.name).join(', ')
    const userText = text || '첨부된 파일을 분석해주세요.'
    return `[첨부 파일: ${fileNames}]\n${userText}`
  }

  // 도구 정의
  const tools = [
    {
      name: 'searchClients',
      description: '고객을 검색합니다. 회사명, 브랜드명으로 검색할 수 있습니다.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색어' },
        },
        required: ['query'],
      },
    },
    {
      name: 'getClientDetail',
      description: '특정 고객사의 상세 정보와 활동 타임라인을 조회합니다. 고객 상담이력, 활동내역 확인에 사용합니다.',
      input_schema: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: '고객사명' },
        },
        required: ['client_name'],
      },
    },
    {
      name: 'getClientActivities',
      description: '특정 고객사의 활동 타임라인(통화, 미팅, 이메일 등)을 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: '고객사명' },
          client_id: { type: 'string', description: '고객사 ID (선택)' },
          limit: { type: 'number', description: '조회할 개수 (기본 50)' },
        },
        required: [],
      },
    },
    {
      name: 'getAllActivities',
      description: '내 모든 고객의 최근 활동 기록을 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '조회할 개수 (기본 30)' },
        },
      },
    },
    {
      name: 'getClients',
      description: '전체 고객 목록 또는 특정 단계의 고객을 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {
          stage: { type: 'string', description: '파이프라인 단계 (선택)' },
          limit: { type: 'number', description: '조회할 개수 (기본 10)' },
        },
      },
    },
    {
      name: 'createClient',
      description: '새 고객을 등록합니다.',
      input_schema: {
        type: 'object',
        properties: {
          company_name: { type: 'string', description: '회사명 (필수)' },
          brand_name: { type: 'string', description: '브랜드명' },
          contact_name: { type: 'string', description: '담당자명' },
          contact_phone: { type: 'string', description: '담당자 전화번호' },
          contact_email: { type: 'string', description: '담당자 이메일' },
        },
        required: ['company_name'],
      },
    },
    {
      name: 'addActivityLog',
      description: '고객에게 통화, 이메일, 카톡, 문자 등의 활동 기록을 추가합니다.',
      input_schema: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: '고객 회사명' },
          activity_type: { type: 'string', description: '활동 유형 (call, email_sent, kakao, sms, meeting, note)' },
          description: { type: 'string', description: '활동 내용' },
        },
        required: ['client_name', 'activity_type', 'description'],
      },
    },
    {
      name: 'changeStage',
      description: '고객의 파이프라인 단계를 변경합니다.',
      input_schema: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: '고객 회사명' },
          new_stage: { type: 'string', description: '새 단계' },
        },
        required: ['client_name', 'new_stage'],
      },
    },
    {
      name: 'getStats',
      description: '영업 통계를 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: '통계 유형: overview 또는 pipeline' },
        },
        required: ['type'],
      },
    },
    {
      name: 'getTodayTasks',
      description: '오늘 해야 할 일과 연락이 필요한 고객을 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    // 일정 관련 도구
    {
      name: 'getTodaySchedules',
      description: '오늘 일정을 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'getTomorrowSchedules',
      description: '내일 일정을 조회합니다. 하루 전 리마인드에 사용합니다.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'getThisWeekSchedules',
      description: '이번 주 전체 일정을 요약해서 보여줍니다.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'getAvailableSlots',
      description: '특정 날짜의 빈 시간대를 조회합니다.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '날짜 (YYYY-MM-DD 형식)' },
        },
        required: ['date'],
      },
    },
    {
      name: 'createSchedule',
      description: '새 일정을 등록합니다.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '일정 제목' },
          date: { type: 'string', description: '날짜 (YYYY-MM-DD)' },
          start_time: { type: 'string', description: '시작 시간 (HH:MM, 기본 10:00)' },
          end_time: { type: 'string', description: '종료 시간 (HH:MM, 기본 11:00)' },
          schedule_type: { type: 'string', description: '일정 유형 (meeting, call, demo, contract, internal, other)' },
          client_name: { type: 'string', description: '고객사명 (선택)' },
          location: { type: 'string', description: '장소 (선택)' },
          contact_name: { type: 'string', description: '담당자명 (선택)' },
          contact_phone: { type: 'string', description: '담당자 연락처 (선택)' },
          description: { type: 'string', description: '메모 (선택)' },
        },
        required: ['title', 'date'],
      },
    },
  ]

  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json({ 
        content: 'GROQ_API_KEY 환경변수가 설정되지 않았습니다. Vercel 설정을 확인해주세요.' 
      }, { status: 200 })
    }

    if (!userId) {
      return Response.json({ 
        content: '로그인이 필요합니다. 다시 로그인해주세요.' 
      }, { status: 200 })
    }

    const groqTools = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }))

    // 메시지 변환 (마지막 사용자 메시지에 파일 첨부)
    const groqMessages: GroqMessage[] = (messages as IncomingMessage[]).map((m, index) => {
      // 마지막 사용자 메시지이고 파일이 있으면 파일 포함
      if (index === messages.length - 1 && m.role === 'user' && files && files.length > 0) {
        return {
          role: m.role,
          content: buildUserContent(m.content, files as AttachedFile[]),
        }
      }
      return {
        role: m.role,
        content: m.content,
      }
    })

    const initialSystemPrompt = `당신은 B2B 영업 AI 비서입니다. 영업 담당자의 업무를 똑똑하게 도와줍니다.

## 🚨 가장 중요한 규칙
**절대로 "응답을 생성할 수 없습니다", "다시 시도해주세요" 같은 말을 하지 마세요!**
**어떤 상황에서도 포기하지 말고, 질문을 통해 해결책을 찾으세요.**

## 📎 파일 첨부 시 처리 방법
사용자가 이미지나 PDF 파일을 첨부하면:
1. 파일 내용을 꼼꼼히 분석합니다
2. 파일이 어떤 문서인지 파악합니다 (명함, 견적서, 제안서, 계약서, 회의록 등)
3. 사용자가 원하는 업무를 예측합니다
4. 예측한 업무에 대해 확인 질문을 합니다
5. 사용자 답변에 따라 업무를 수행합니다

**파일 분석 예시:**

[명함 이미지를 받았을 때]
AI: "명함을 확인했어요! 📇

**분석 결과:**
- 회사명: OOO
- 담당자: OOO 
- 연락처: OOO
- 이메일: OOO

이 정보로 **새 고객을 등록**해드릴까요? 
아니면 기존 고객 정보를 **업데이트**할까요?"

[견적서/제안서를 받았을 때]
AI: "견적서(제안서)를 확인했어요! 📄

주요 내용을 정리했습니다:
- 고객사: OOO
- 금액: OOO
- 제품/서비스: OOO

어떤 작업을 도와드릴까요?
1. 해당 고객의 **활동 기록에 추가**
2. **파이프라인 단계 변경**
3. **미팅/후속 일정 등록**"

[계약서를 받았을 때]
AI: "계약서를 확인했어요! 📝

계약 정보:
- 고객사: OOO
- 계약 기간: OOO
- 계약 금액: OOO

고객 상태를 **'계약완료'로 변경**할까요?
활동 기록에 계약 내용을 **추가**할까요?"

## 작업 방식
1. 요청이 복잡하면 → 하나씩 질문해서 정보 수집
2. 정보가 부족하면 → 필요한 것을 물어보기
3. 도구 실행 실패하면 → 왜 실패했는지 설명하고 다른 방법 제안
4. 모르겠으면 → 사용자에게 더 자세히 설명해달라고 요청
5. 쓰기 작업(생성, 수정, 삭제, 단계변경)을 할 때는 반드시 해당 도구를 호출하세요. 시스템이 사용자에게 확인을 요청합니다.

## 쓰기 작업 규칙
- 생성/수정/삭제/단계변경 요청은 반드시 도구 호출로 처리
- 도구 호출 전에 무엇을 하려는지 자연스럽게 설명
- 최종 확인 플로우는 시스템이 처리

## 예시 상황별 대응

**복잡한 요청 받았을 때:**
사용자: "맥스원이링크 미팅하고 제안서 보내줘"
AI: "맥스원이링크 미팅과 제안서 발송을 정리해드릴게요! 📝

먼저 몇 가지 확인이 필요해요:
1. 미팅 날짜는 언제였나요?
2. 미팅에서 어떤 내용을 논의하셨나요?
3. 제안서는 이미 보내셨나요, 아니면 제가 발송을 도와드릴까요?"

**정보가 애매할 때:**
사용자: "고객 등록해줘"
AI: "새 고객 등록을 도와드릴게요! 📋

다음 정보를 알려주세요:
- 회사명 (필수)
- 담당자명과 연락처
- 관심 제품이나 문의 내용"

**도구 실행 실패했을 때:**
AI: "앗, 시스템에서 처리하는 데 문제가 있네요. 😅
다른 방법으로 도와드릴게요. [대안 제시]"

## 파이프라인 단계
- inquiry: 문의접수
- called: 전화완료
- email_sent: 메일전송
- meeting: 미팅
- meeting_followup: 미팅후메일
- reviewing: 검토중
- in_progress: 계약진행중
- completed: 계약완료
- failed: 실패
- on_hold: 보류

## 활동 유형
- call: 통화
- email_sent: 이메일 발송
- kakao: 카카오톡
- sms: 문자
- meeting: 미팅
- note: 메모

## 일정 유형
- meeting: 미팅 🤝
- call: 전화 📞
- demo: 데모 💻
- contract: 계약 📝
- internal: 내부회의 👥
- other: 기타 📌

## 일정 관련 기능
- 오늘/내일/이번 주 일정 조회 가능
- 새 일정 등록 가능
- 빈 시간대 추천 가능
- 내일 일정이 있으면 리마인드 해주기

## 일정 관련 예시

사용자: "이번 주 일정 알려줘"
AI: "이번 주 일정을 확인해볼게요! 📅" → getThisWeekSchedules 도구 사용

사용자: "내일 일정 있어?"
AI: "내일 일정 확인해드릴게요!" → getTomorrowSchedules 도구 사용

사용자: "다음 주 월요일 10시에 맥스원이링크 미팅 잡아줘"
AI: "일정을 등록해드릴게요!" → createSchedule 도구 사용

사용자: "화요일에 빈 시간 언제야?"
AI: "화요일 빈 시간대 확인해볼게요!" → getAvailableSlots 도구 사용

## 고객 상담이력/활동 타임라인 기능
- 고객사별 모든 활동 기록 조회 가능 (통화, 미팅, 이메일, 카톡 등)
- 고객 관련 요청 시 활동 타임라인을 먼저 조회해서 맥락 파악
- 상담이력, 히스토리, 활동내역, 타임라인 관련 요청 시 활용

## 활동 타임라인 예시

사용자: "맥스원이링크 상담이력 확인해줘"
AI: → getClientDetail 도구로 고객 정보 + 활동 타임라인 조회

사용자: "고운아침이랑 어떤 이야기 나눴었지?"
AI: → getClientActivities 도구로 활동 기록 조회 후 정리

사용자: "최근 활동 내역 보여줘"
AI: → getAllActivities 도구로 전체 활동 조회

## 응답 규칙
- 한국어로 친근하게 답변
- 이모지 적절히 사용 (✅ ❌ 📞 📧 📝 🤝 📊 📅 😊)
- 항상 다음에 할 수 있는 것 제안

    - **절대 포기하지 않기!**`

    const followupSystemPrompt = `당신은 B2B 영업 AI 비서입니다. 도구 실행 결과를 바탕으로 친절하게 응답하세요.

## 🚨 가장 중요한 규칙
**절대 포기하지 마세요! 오류가 나도 다른 방법을 제안하세요.**

## 응답 규칙
- 한국어로 친근하게 답변
- 이모지 사용 (✅ ❌ 📞 📧 📝 🤝 📊)
- 성공 시 ✅, 문제 있으면 😅하고 대안 제시
- 항상 다음에 할 수 있는 것 제안`

    const ensureStringContent = (msgs: GroqMessage[]): GroqMessage[] =>
      msgs.map(msg => {
        if (typeof msg.content === 'string' || msg.content === null || msg.content === undefined) return msg
        if (Array.isArray(msg.content)) {
          const textParts = (msg.content as GroqContentPart[])
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map(p => p.text)
          return { ...msg, content: textParts.join('\n') || '' }
        }
        return { ...msg, content: String(msg.content) }
      })

    const callGroq = async (chatMessages: GroqMessage[], systemPrompt: string, useTools = true) => {
      const safeMessages = ensureStringContent(chatMessages)
      const body: Record<string, unknown> = {
        model: GROQ_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'system', content: systemPrompt }, ...safeMessages],
      }
      if (useTools) {
        body.tools = groqTools
        body.tool_choice = 'auto'
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) {
        const message = data?.error?.message || `Groq API 호출 실패 (${response.status})`
        if (useTools && message.includes('failed_generation')) {
          console.log('Groq failed_generation with tools, retrying without tools...')
          return callGroq(chatMessages, systemPrompt, false)
        }
        throw new Error(message)
      }

      return data
    }

    const supportedMediaTypes = (f: AttachedFile) =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    const hasMediaFiles = files && (files as AttachedFile[]).some(supportedMediaTypes)

    if (hasMediaFiles && GEMINI_API_KEY) {
      const lastMsg = groqMessages[groqMessages.length - 1]
      const originalText = typeof lastMsg.content === 'string' ? lastMsg.content : ''

      const geminiParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = []
      for (const file of files as AttachedFile[]) {
        if (supportedMediaTypes(file)) {
          geminiParts.push({ inline_data: { mime_type: file.type, data: file.data } })
        }
      }

      const userContext = originalText.replace(/^\[첨부 파일:.*?\]\n?/, '').trim()
      geminiParts.push({
        text: `다음은 B2B 영업 관리 시스템에서 사용자가 첨부한 파일입니다.
파일에 포함된 모든 텍스트, 데이터, 정보를 빠짐없이 정확하게 추출해주세요.

분석 지침:
- 명함: 이름, 회사명, 직함, 전화번호, 이메일, 주소를 구분하여 정리
- 견적서/제안서: 고객사, 금액, 제품/서비스, 날짜 등 주요 항목 정리
- 계약서: 계약 당사자, 기간, 금액, 주요 조건 정리
- 표 형태 데이터: 구조를 유지해서 정리
- PDF 문서: 전체 내용을 읽고 핵심 정보 추출
- 기타: 문서 종류를 파악하고 관련 정보 추출

${userContext ? `사용자 메시지: ${userContext}` : ''}`,
      })

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: geminiParts }],
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        })

        const geminiData = await geminiResponse.json()
        if (geminiResponse.ok) {
          const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (analysis.trim()) {
            console.log('Gemini analysis:', analysis.substring(0, 200))
            lastMsg.content = `[첨부 파일 분석 결과]\n${analysis}\n\n[사용자 요청]\n${userContext || '첨부된 파일을 확인해주세요.'}`
          } else {
            console.warn('Gemini returned empty analysis')
            lastMsg.content = `${originalText}\n\n(파일 내용을 추출하지 못했습니다. 파일 내용을 텍스트로 설명해주시면 처리해드릴게요.)`
          }
        } else {
          const errDetail = geminiData?.error?.message || JSON.stringify(geminiData).substring(0, 200)
          console.error('Gemini API error:', errDetail)
          lastMsg.content = `${originalText}\n\n(파일 분석에 실패했습니다. 파일 내용을 텍스트로 설명해주시면 처리해드릴게요.)`
        }
      } catch (visionError) {
        console.error('Gemini vision error:', visionError)
        lastMsg.content = `${originalText}\n\n(파일 분석 중 오류가 발생했습니다. 파일 내용을 텍스트로 설명해주시면 처리해드릴게요.)`
      }
    } else if (hasMediaFiles) {
      const lastMsg = groqMessages[groqMessages.length - 1]
      const originalText = typeof lastMsg.content === 'string' ? lastMsg.content : ''
      lastMsg.content = `${originalText}\n\n(GEMINI_API_KEY가 설정되지 않아 파일을 분석할 수 없습니다.)`
    }

    let data = await callGroq(groqMessages, initialSystemPrompt)
    let assistantMessage: {
      content?: string | null
      tool_calls?: GroqToolCall[]
    } = data.choices?.[0]?.message || {}
    let pendingActionPlan: ActionPlan | undefined
    let approvalMessage = ''

    console.log('Initial API response:', JSON.stringify(data, null, 2))

    // 도구 사용 루프
    let loopCount = 0
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && loopCount < 10) {
      loopCount++
      const toolCalls = assistantMessage.tool_calls

      groqMessages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: toolCalls,
      })

      for (const toolCall of toolCalls) {
        let parsedInput: Record<string, unknown> = {}
        const rawArgs = toolCall.function.arguments
        if (rawArgs && rawArgs !== 'null' && rawArgs !== '{}') {
          try {
            const parsed = JSON.parse(rawArgs)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsedInput = parsed as Record<string, unknown>
            }
          } catch {
            console.error('Tool arguments parse error:', rawArgs)
          }
        }

        console.log('Tool use:', toolCall.function.name, parsedInput)
        let toolResult: Record<string, unknown>
        try {
          toolResult = await executeTool(toolCall.function.name, parsedInput, userId)
        } catch (toolError) {
          console.error('Tool execution error:', toolCall.function.name, toolError)
          toolResult = { error: `도구 실행 실패: ${toolCall.function.name}` }
        }

        if (toolResult.needsApproval === true) {
          const actionPlan = toolResult.actionPlan
          if (
            actionPlan &&
            typeof actionPlan === 'object' &&
            !Array.isArray(actionPlan) &&
            'plan_id' in actionPlan &&
            typeof actionPlan.plan_id === 'string'
          ) {
            pendingActionPlan = actionPlan as ActionPlan
            if (typeof assistantMessage.content === 'string' && assistantMessage.content.trim().length > 0) {
              approvalMessage = assistantMessage.content
            }
          }
        }

        console.log('Tool result:', toolResult)

        groqMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        })
      }

      if (pendingActionPlan) {
        break
      }

      data = await callGroq(groqMessages, followupSystemPrompt)
      assistantMessage = data.choices?.[0]?.message || {}
      console.log('Loop response:', JSON.stringify(data, null, 2))
    }

    if (pendingActionPlan) {
      const response: ChatApiResponse = {
        content: approvalMessage || '요청하신 작업을 실행하기 전에 확인이 필요합니다. 진행할까요?',
        actionPlan: pendingActionPlan,
      }
      return Response.json(response)
    }

    const finalText = assistantMessage.content
    console.log('Final text:', finalText)

    if (typeof finalText === 'string' && finalText.trim().length > 0) {
      const response: ChatApiResponse = { content: finalText }
      return Response.json(response)
    }

    // 응답이 없으면 질문으로 대체 (절대 포기하지 않음!)
    const fallbackResponse: ChatApiResponse = {
      content: '제가 요청을 정확히 이해했는지 확인하고 싶어요! 😊\n\n어떤 작업을 도와드릴까요?\n- 고객 조회/등록\n- 활동 기록 추가 (통화, 미팅, 이메일 등)\n- 파이프라인 단계 변경\n- 영업 통계 확인\n\n자세히 알려주시면 바로 처리해드릴게요!' 
    }
    return Response.json(fallbackResponse)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('API Error:', errMsg, error)
    const errorResponse: ChatApiResponse = {
      content: `앗, 처리 중 문제가 있었어요. 😅\n\n오류: ${errMsg}\n\n다시 한 번 시도해주시겠어요?` 
    }
    return Response.json(errorResponse)
  }
}
