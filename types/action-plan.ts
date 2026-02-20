export type ActionIntent =
  | 'create_client'
  | 'update_client'
  | 'add_contact'
  | 'log_activity'
  | 'move_pipeline'
  | 'create_schedule'
  | 'update_schedule'
  | 'create_reminder'
  | 'draft_email'
  | 'send_email'
  | 'create_proposal'
  | 'attach_document'
  | 'delete_client'
  | 'delete_schedule'

export type ActionType =
  | 'supabase.insert'
  | 'supabase.update'
  | 'supabase.delete'
  | 'supabase.select'
  | 'groupware.send_email'

export type RiskFlag =
  | 'duplicate_client'
  | 'unknown_stage'
  | 'missing_date'
  | 'send_email_risk'
  | 'delete_risk'
  | 'high_value_change'

export interface ActionStep {
  type: ActionType
  table: string
  where?: Record<string, unknown>
  values?: Record<string, unknown>
  notes?: string
  result_key?: string
}

export interface ActionPlan {
  plan_id: string
  intent: ActionIntent
  confidence: number
  entities: Record<string, unknown>
  actions: ActionStep[]
  needs_confirmation: boolean
  confirmation_message: string
  missing_fields: string[]
  risk_flags: RiskFlag[]
  duplicate_candidates?: Array<{
    id: string
    company_name: string
    similarity: string
  }>
}

export type ActionPlanStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'executed' | 'failed'

export interface StepResult {
  step_index: number
  action_type: ActionType
  table: string
  status: 'success' | 'error' | 'skipped'
  data?: Record<string, unknown>
  error?: string
}

export interface ActionPlanResult {
  plan_id: string
  status: 'success' | 'error' | 'rolled_back'
  message: string
  rolled_back: boolean
  failed_step: number | null
  data?: Record<string, unknown>
  step_results?: StepResult[]
}

export interface ChatApiResponse {
  content: string
  actionPlan?: ActionPlan
}

export interface ExecuteRequest {
  plan: ActionPlan
  userId: string
  modifications?: Record<string, unknown>
}
