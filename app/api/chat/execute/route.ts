import { createClient } from '@supabase/supabase-js'
import type { ActionPlan, ActionPlanResult } from '@/types/action-plan'
import type { ActivityType, PipelineStage, ScheduleType } from '@/types/database'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const allowedStages: PipelineStage[] = [
  'inquiry',
  'called',
  'email_sent',
  'meeting',
  'meeting_followup',
  'reviewing',
  'in_progress',
  'completed',
  'failed',
  'on_hold',
]

const allowedActivityTypes: ActivityType[] = [
  'call',
  'email_sent',
  'email_received',
  'kakao',
  'sms',
  'meeting',
  'note',
  'stage_change',
  'proposal_sent',
  'contract_sent',
]

const allowedScheduleTypes: ScheduleType[] = ['meeting', 'call', 'demo', 'contract', 'internal', 'other']

type ExecuteBody = {
  plan?: ActionPlan
  userId?: string
  modifications?: Record<string, unknown>
}

function errorResult(planId: string, message: string, data?: Record<string, unknown>): ActionPlanResult {
  return {
    plan_id: planId,
    status: 'error',
    message,
    data,
  }
}

function successResult(planId: string, message: string, data?: Record<string, unknown>): ActionPlanResult {
  return {
    plan_id: planId,
    status: 'success',
    message,
    data,
  }
}

function getString(entities: Record<string, unknown>, key: string): string | undefined {
  const value = entities[key]
  return typeof value === 'string' ? value : undefined
}

function getRequiredFields(intent: ActionPlan['intent'], entities: Record<string, unknown>): string[] {
  switch (intent) {
    case 'create_client': {
      return typeof entities.company_name === 'string' && entities.company_name.trim().length > 0 ? [] : ['company_name']
    }
    case 'add_contact': {
      const missing: string[] = []
      if (typeof entities.client_id !== 'string' && typeof entities.client_name !== 'string') {
        missing.push('client_id|client_name')
      }
      if (typeof entities.contact_name !== 'string' && typeof entities.name !== 'string') {
        missing.push('contact_name')
      }
      return missing
    }
    case 'log_activity': {
      const missing: string[] = []
      if (typeof entities.client_name !== 'string') missing.push('client_name')
      if (typeof entities.activity_type !== 'string') missing.push('activity_type')
      if (typeof entities.description !== 'string') missing.push('description')
      return missing
    }
    case 'move_pipeline': {
      const missing: string[] = []
      if (typeof entities.client_name !== 'string') missing.push('client_name')
      if (typeof entities.new_stage !== 'string' && typeof entities.pipeline_stage !== 'string') {
        missing.push('new_stage')
      }
      return missing
    }
    case 'create_schedule': {
      const missing: string[] = []
      if (typeof entities.title !== 'string') missing.push('title')
      if (typeof entities.date !== 'string') missing.push('date')
      return missing
    }
    default:
      return []
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExecuteBody
    const plan = body.plan
    const userId = body.userId
    const modifications = body.modifications

    if (!plan || typeof plan !== 'object' || !plan.plan_id) {
      const result = errorResult('unknown_plan', '유효한 ActionPlan이 필요합니다.')
      return Response.json(result, { status: 400 })
    }

    if (!userId || userId.trim().length === 0) {
      const result = errorResult(plan.plan_id, 'userId가 필요합니다.')
      return Response.json(result, { status: 400 })
    }

    const entities: Record<string, unknown> = {
      ...plan.entities,
      ...(modifications || {}),
    }

    const missingFields = getRequiredFields(plan.intent, entities)
    if (missingFields.length > 0) {
      const result = errorResult(plan.plan_id, '필수 정보가 부족합니다.', { missing_fields: missingFields })
      return Response.json(result, { status: 400 })
    }

    const nextStageValue = getString(entities, 'new_stage') || getString(entities, 'pipeline_stage')
    if (plan.intent === 'move_pipeline' && (!nextStageValue || !allowedStages.includes(nextStageValue as PipelineStage))) {
      const result = errorResult(plan.plan_id, '유효하지 않은 pipeline_stage입니다.', {
        allowed_stages: allowedStages,
      })
      return Response.json(result, { status: 400 })
    }

    if (plan.intent === 'create_client') {
      const companyName = getString(entities, 'company_name')
      if (!companyName) {
        const result = errorResult(plan.plan_id, '회사명(company_name)은 필수입니다.')
        return Response.json(result, { status: 400 })
      }

      const { data: duplicateRows, error: duplicateError } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('user_id', userId)
        .ilike('company_name', companyName)
        .limit(5)

      if (duplicateError) {
        const result = errorResult(plan.plan_id, `중복 확인 중 오류가 발생했습니다: ${duplicateError.message}`)
        return Response.json(result, { status: 500 })
      }

      const exactDuplicate = (duplicateRows || []).find(
        (row) => row.company_name.trim().toLowerCase() === companyName.trim().toLowerCase()
      )

      if (exactDuplicate) {
        const result = errorResult(plan.plan_id, '동일한 회사명이 이미 존재합니다. 신규 생성 대신 업데이트를 권장합니다.', {
          duplicate_client_id: exactDuplicate.id,
          duplicate_company_name: exactDuplicate.company_name,
          suggestion: 'update_client',
        })
        return Response.json(result, { status: 409 })
      }

      const { data: insertedClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          company_name: companyName,
          brand_name: getString(entities, 'brand_name') || null,
          industry: getString(entities, 'industry') || null,
          ceo_name: getString(entities, 'ceo_name') || null,
          inquiry_source: getString(entities, 'inquiry_source') || null,
          interest_product: getString(entities, 'interest_product') || null,
          notes: getString(entities, 'notes') || null,
          pipeline_stage: 'inquiry',
          last_contacted_at: new Date().toISOString(),
        })
        .select('id, company_name, pipeline_stage')
        .single()

      if (clientError || !insertedClient) {
        const result = errorResult(plan.plan_id, `고객 생성에 실패했습니다: ${clientError?.message || 'unknown error'}`)
        return Response.json(result, { status: 500 })
      }

      const contactName = getString(entities, 'contact_name') || getString(entities, 'name')
      if (contactName) {
        const { error: contactError } = await supabase.from('contacts').insert({
          client_id: insertedClient.id,
          name: contactName,
          position: getString(entities, 'contact_position') || getString(entities, 'position') || null,
          email: getString(entities, 'contact_email') || getString(entities, 'email') || null,
          phone: getString(entities, 'contact_phone') || getString(entities, 'phone') || null,
          is_primary: true,
        })

        if (contactError) {
          const result = errorResult(plan.plan_id, `연락처 생성에 실패했습니다: ${contactError.message}`)
          return Response.json(result, { status: 500 })
        }
      }

      const { error: activityError } = await supabase.from('activity_logs').insert({
        client_id: insertedClient.id,
        user_id: userId,
        activity_type: 'note',
        description: '신규 고객 등록',
      })

      if (activityError) {
        const result = errorResult(plan.plan_id, `활동 로그 생성에 실패했습니다: ${activityError.message}`)
        return Response.json(result, { status: 500 })
      }

      const result = successResult(plan.plan_id, `${insertedClient.company_name} 고객이 등록되었습니다.`, {
        client: insertedClient,
      })
      return Response.json(result)
    }

    if (plan.intent === 'add_contact') {
      let clientId = getString(entities, 'client_id')
      if (!clientId) {
        const clientName = getString(entities, 'client_name')
        if (!clientName) {
          const result = errorResult(plan.plan_id, '연락처를 추가할 고객 정보가 없습니다.')
          return Response.json(result, { status: 400 })
        }

        const { data: clients } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('user_id', userId)
          .ilike('company_name', `%${clientName}%`)
          .limit(1)

        if (!clients || clients.length === 0) {
          const result = errorResult(plan.plan_id, `"${clientName}" 고객을 찾을 수 없습니다.`)
          return Response.json(result, { status: 404 })
        }
        clientId = clients[0].id
      }

      const contactName = getString(entities, 'contact_name') || getString(entities, 'name')
      if (!contactName) {
        const result = errorResult(plan.plan_id, 'contact_name이 필요합니다.')
        return Response.json(result, { status: 400 })
      }

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          client_id: clientId,
          name: contactName,
          position: getString(entities, 'position') || null,
          email: getString(entities, 'email') || null,
          phone: getString(entities, 'phone') || null,
          is_primary: Boolean(entities.is_primary),
        })
        .select('id, name, email, phone')
        .single()

      if (contactError || !contact) {
        const result = errorResult(plan.plan_id, `연락처 등록에 실패했습니다: ${contactError?.message || 'unknown error'}`)
        return Response.json(result, { status: 500 })
      }

      const result = successResult(plan.plan_id, `${contact.name} 연락처를 추가했습니다.`, { contact })
      return Response.json(result)
    }

    if (plan.intent === 'log_activity') {
      const clientName = getString(entities, 'client_name')
      const activityTypeValue = getString(entities, 'activity_type')
      const description = getString(entities, 'description')

      if (!clientName || !activityTypeValue || !description) {
        const result = errorResult(plan.plan_id, 'client_name, activity_type, description이 필요합니다.')
        return Response.json(result, { status: 400 })
      }

      if (!allowedActivityTypes.includes(activityTypeValue as ActivityType)) {
        const result = errorResult(plan.plan_id, '유효하지 않은 activity_type입니다.', {
          allowed_activity_types: allowedActivityTypes,
        })
        return Response.json(result, { status: 400 })
      }

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('user_id', userId)
        .ilike('company_name', `%${clientName}%`)
        .limit(1)

      if (!clients || clients.length === 0) {
        const result = errorResult(plan.plan_id, `"${clientName}" 고객을 찾을 수 없습니다.`)
        return Response.json(result, { status: 404 })
      }

      const matchedClient = clients[0]

      const { error: logError } = await supabase.from('activity_logs').insert({
        client_id: matchedClient.id,
        user_id: userId,
        activity_type: activityTypeValue,
        description,
      })

      if (logError) {
        const result = errorResult(plan.plan_id, `활동 기록 추가에 실패했습니다: ${logError.message}`)
        return Response.json(result, { status: 500 })
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', matchedClient.id)

      if (updateError) {
        const result = errorResult(plan.plan_id, `고객 업데이트에 실패했습니다: ${updateError.message}`)
        return Response.json(result, { status: 500 })
      }

      const result = successResult(plan.plan_id, `${matchedClient.company_name}에 활동 기록을 추가했습니다.`)
      return Response.json(result)
    }

    if (plan.intent === 'move_pipeline') {
      const clientName = getString(entities, 'client_name')
      const nextStage = nextStageValue as PipelineStage | undefined
      if (!clientName || !nextStage) {
        const result = errorResult(plan.plan_id, 'client_name과 new_stage가 필요합니다.')
        return Response.json(result, { status: 400 })
      }

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('user_id', userId)
        .ilike('company_name', `%${clientName}%`)
        .limit(1)

      if (!clients || clients.length === 0) {
        const result = errorResult(plan.plan_id, `"${clientName}" 고객을 찾을 수 없습니다.`)
        return Response.json(result, { status: 404 })
      }

      const targetClient = clients[0]
      const updatePayload: {
        pipeline_stage: PipelineStage
        failure_reason?: string | null
        failure_category?: string | null
      } = {
        pipeline_stage: nextStage,
      }

      if (nextStage === 'failed') {
        updatePayload.failure_reason = getString(entities, 'failure_reason') || null
        updatePayload.failure_category = getString(entities, 'failure_category') || null
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update(updatePayload)
        .eq('id', targetClient.id)

      if (updateError) {
        const result = errorResult(plan.plan_id, `파이프라인 단계 변경에 실패했습니다: ${updateError.message}`)
        return Response.json(result, { status: 500 })
      }

      const { error: logError } = await supabase.from('activity_logs').insert({
        client_id: targetClient.id,
        user_id: userId,
        activity_type: 'stage_change',
        description: `파이프라인 단계를 ${nextStage}(으)로 변경`,
      })

      if (logError) {
        const result = errorResult(plan.plan_id, `단계 변경 로그 생성에 실패했습니다: ${logError.message}`)
        return Response.json(result, { status: 500 })
      }

      const result = successResult(plan.plan_id, `${targetClient.company_name} 단계가 ${nextStage}(으)로 변경되었습니다.`)
      return Response.json(result)
    }

    if (plan.intent === 'create_schedule') {
      const title = getString(entities, 'title')
      const date = getString(entities, 'date')
      const startTime = getString(entities, 'start_time') || '10:00'
      const endTime = getString(entities, 'end_time') || '11:00'
      const scheduleType = (getString(entities, 'schedule_type') || 'meeting') as ScheduleType

      if (!title || !date) {
        const result = errorResult(plan.plan_id, 'title과 date가 필요합니다.')
        return Response.json(result, { status: 400 })
      }

      if (!allowedScheduleTypes.includes(scheduleType)) {
        const result = errorResult(plan.plan_id, '유효하지 않은 schedule_type입니다.', {
          allowed_schedule_types: allowedScheduleTypes,
        })
        return Response.json(result, { status: 400 })
      }

      const startDateTime = new Date(`${date}T${startTime}:00`)
      const endDateTime = new Date(`${date}T${endTime}:00`)
      if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
        const result = errorResult(plan.plan_id, '날짜 또는 시간 형식이 올바르지 않습니다.')
        return Response.json(result, { status: 400 })
      }

      let clientId: string | null = null
      const clientName = getString(entities, 'client_name')
      if (clientName) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('user_id', userId)
          .ilike('company_name', `%${clientName}%`)
          .limit(1)

        if (clients && clients.length > 0) {
          clientId = clients[0].id
        }
      }

      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          user_id: userId,
          client_id: clientId,
          title,
          schedule_type: scheduleType,
          description: getString(entities, 'description') || null,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          location: getString(entities, 'location') || null,
          contact_name: getString(entities, 'contact_name') || null,
          contact_phone: getString(entities, 'contact_phone') || null,
        })
        .select('id, title, start_date, end_date, schedule_type')
        .single()

      if (scheduleError || !schedule) {
        const result = errorResult(plan.plan_id, `일정 생성에 실패했습니다: ${scheduleError?.message || 'unknown error'}`)
        return Response.json(result, { status: 500 })
      }

      const result = successResult(plan.plan_id, `"${title}" 일정을 생성했습니다.`, { schedule })
      return Response.json(result)
    }

    const result = errorResult(plan.plan_id, `현재 지원하지 않는 intent입니다: ${plan.intent}`)
    return Response.json(result, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const result: ActionPlanResult = {
      plan_id: 'unknown_plan',
      status: 'error',
      message: `실행 중 오류가 발생했습니다: ${message}`,
    }
    return Response.json(result, { status: 500 })
  }
}
