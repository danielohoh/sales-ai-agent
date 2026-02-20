import { createClient } from '@supabase/supabase-js'
import type { ActionPlan, ActionPlanResult, ActionStep, StepResult } from '@/types/action-plan'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED_TABLES = new Set([
  'clients', 'contacts', 'activity_logs', 'schedules', 'reminders', 'proposals', 'email_queue',
])

const FIELD_VALIDATORS: Record<string, Record<string, Set<string>>> = {
  clients: {
    pipeline_stage: new Set([
      'inquiry', 'called', 'email_sent', 'meeting', 'meeting_followup',
      'reviewing', 'in_progress', 'completed', 'failed', 'on_hold',
    ]),
  },
  activity_logs: {
    activity_type: new Set([
      'call', 'email_sent', 'email_received', 'kakao', 'sms',
      'meeting', 'note', 'stage_change', 'proposal_sent', 'contract_sent',
    ]),
  },
  schedules: {
    schedule_type: new Set(['meeting', 'call', 'demo', 'contract', 'internal', 'other']),
  },
}

type ExecuteBody = {
  plan?: ActionPlan
  userId?: string
  modifications?: Record<string, unknown>
}

interface PgStepResult {
  step: number
  status: string
  table: string
  id?: string
}

interface PgFunctionResult {
  success: boolean
  rolled_back: boolean
  failed_step: number | null
  message?: string
  client_id?: string
  step_results: PgStepResult[]
}

function makeResult(
  planId: string,
  status: ActionPlanResult['status'],
  message: string,
  stepResults?: StepResult[],
  data?: Record<string, unknown>,
  rolledBack = false,
  failedStep: number | null = null
): ActionPlanResult {
  return { plan_id: planId, status, message, rolled_back: rolledBack, failed_step: failedStep, step_results: stepResults, data }
}

function validateActions(actions: ActionStep[]): string | null {
  for (const action of actions) {
    if (!ALLOWED_TABLES.has(action.table)) {
      return `허용되지 않은 테이블: ${action.table}`
    }
    const validators = FIELD_VALIDATORS[action.table]
    if (validators && action.values) {
      for (const [field, allowed] of Object.entries(validators)) {
        const val = action.values[field]
        if (val !== undefined && val !== null && typeof val === 'string' && !allowed.has(val)) {
          return `유효하지 않은 ${field}: "${val}" (${action.table})`
        }
      }
    }
  }
  return null
}

function parseStepResults(pgResults: PgStepResult[], actions: ActionStep[]): StepResult[] {
  return pgResults.map((sr) => ({
    step_index: sr.step,
    action_type: actions[sr.step]?.type ?? 'supabase.insert',
    table: sr.table ?? actions[sr.step]?.table ?? 'unknown',
    status: sr.status as StepResult['status'],
    data: sr.id ? { id: sr.id } : undefined,
  }))
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExecuteBody
    const { plan, userId, modifications } = body

    if (!plan || typeof plan !== 'object' || !plan.plan_id) {
      return Response.json(makeResult('unknown', 'error', '유효한 ActionPlan이 필요합니다.'), { status: 400 })
    }

    if (!userId || userId.trim().length === 0) {
      return Response.json(makeResult(plan.plan_id, 'error', 'userId가 필요합니다.'), { status: 400 })
    }

    if (!plan.actions || plan.actions.length === 0) {
      return Response.json(makeResult(plan.plan_id, 'error', '실행할 액션이 없습니다.'), { status: 400 })
    }

    const entities: Record<string, unknown> = { ...plan.entities, ...(modifications || {}) }

    const actions: ActionStep[] = modifications
      ? plan.actions.map((action) => {
          if (!action.values) return action
          const values = { ...action.values }
          for (const key of Object.keys(values)) {
            if (key in entities && entities[key] !== undefined) {
              values[key] = entities[key]
            }
          }
          return { ...action, values }
        })
      : plan.actions

    const validationError = validateActions(actions)
    if (validationError) {
      return Response.json(makeResult(plan.plan_id, 'error', validationError), { status: 400 })
    }

    if (plan.intent === 'create_client') {
      const companyName = typeof entities.company_name === 'string' ? entities.company_name.trim() : ''
      if (companyName) {
        const { data: dupes } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('user_id', userId)
          .ilike('company_name', companyName)
          .limit(5)

        const exact = dupes?.find(
          (d) => d.company_name.trim().toLowerCase() === companyName.toLowerCase()
        )
        if (exact) {
          return Response.json(
            makeResult(plan.plan_id, 'error', '동일한 회사명이 이미 존재합니다. 업데이트를 권장합니다.', [], {
              duplicate_client_id: exact.id,
              duplicate_company_name: exact.company_name,
              suggestion: 'update_client',
            }),
            { status: 409 }
          )
        }
      }
    }

    const clientName =
      plan.intent !== 'create_client' && typeof entities.client_name === 'string'
        ? entities.client_name
        : null

    const { data, error } = await supabase.rpc('execute_action_plan', {
      p_actions: actions.map((a) => ({
        type: a.type,
        table: a.table,
        values: a.values || {},
        where: a.where || {},
      })),
      p_user_id: userId,
      p_client_name: clientName,
    })

    if (error) {
      return Response.json(
        makeResult(plan.plan_id, 'error', `트랜잭션 실행 실패: ${error.message}`),
        { status: 500 }
      )
    }

    const pgResult = data as PgFunctionResult

    if (!pgResult.success) {
      const failedStep = pgResult.failed_step ?? 0
      const failedAction = actions[failedStep]
      const stepResults = parseStepResults(pgResult.step_results || [], actions)

      if (!stepResults.find((s) => s.step_index === failedStep)) {
        stepResults.push({
          step_index: failedStep,
          action_type: failedAction?.type ?? 'supabase.insert',
          table: failedAction?.table ?? 'unknown',
          status: 'error',
          error: pgResult.message,
        })
      }

      return Response.json(
        makeResult(
          plan.plan_id,
          'rolled_back',
          `Step ${failedStep + 1} 실패 (${failedAction?.notes || failedAction?.table || 'unknown'}): ${pgResult.message}. 모든 변경사항이 자동 롤백되었습니다.`,
          stepResults,
          undefined,
          pgResult.rolled_back,
          pgResult.failed_step
        ),
        { status: 500 }
      )
    }

    const stepResults = parseStepResults(pgResult.step_results || [], actions)
    const successCount = stepResults.filter((s) => s.status === 'success').length
    const skippedCount = stepResults.filter((s) => s.status === 'skipped').length

    const completedNotes = actions
      .filter((_, i) => stepResults[i]?.status === 'success')
      .map((a) => a.notes)
      .filter(Boolean)

    let message = completedNotes.length > 0
      ? `${completedNotes.join(', ')} — ${successCount}개 작업 완료`
      : `${successCount}개 작업 완료`
    if (skippedCount > 0) message += ` (${skippedCount}개 건너뜀)`

    const summaryData: Record<string, unknown> = {}
    if (pgResult.client_id) summaryData.client_id = pgResult.client_id

    return Response.json(makeResult(plan.plan_id, 'success', message, stepResults, summaryData, false, null))
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return Response.json(
      makeResult('unknown', 'error', `실행 중 오류가 발생했습니다: ${msg}`),
      { status: 500 }
    )
  }
}
