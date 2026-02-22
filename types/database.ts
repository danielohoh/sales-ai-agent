// 파이프라인 단계
export type PipelineStage =
  | 'inquiry'          // 문의접수
  | 'called'           // 전화완료
  | 'email_sent'       // 메일전송
  | 'meeting'          // 미팅
  | 'meeting_followup' // 미팅 내용 메일 전달
  | 'reviewing'        // 검토
  | 'failed'           // 실패
  | 'on_hold'          // 보류
  | 'in_progress'      // 계약진행중
  | 'completed'        // 계약완료

// 문의 경로
export type InquirySource =
  | 'website'    // 홈페이지
  | 'phone'      // 전화
  | 'referral'   // 소개
  | 'exhibition' // 전시회
  | 'other'      // 기타

// 실패 카테고리 (AI 자동 분류)
export type FailureCategory =
  | 'price'      // 가격
  | 'timing'     // 타이밍/시기
  | 'competitor' // 경쟁사 선택
  | 'internal'   // 내부 사정
  | 'feature'    // 기능 부족
  | 'other'      // 기타

// 활동 유형
export type ActivityType =
  | 'call'
  | 'email_sent'
  | 'email_received'
  | 'kakao'
  | 'sms'
  | 'meeting'
  | 'note'
  | 'stage_change'
  | 'proposal_sent'
  | 'contract_sent'

// 리마인더 유형
export type ReminderType =
  | 'no_contact_3days'
  | 'no_response_7days'
  | 'meeting_tomorrow'
  | 'custom'

// 일정 유형
export type ScheduleType =
  | 'meeting'    // 미팅
  | 'call'       // 전화
  | 'demo'       // 데모
  | 'contract'   // 계약
  | 'internal'   // 내부회의
  | 'other'      // 기타

// 일정 상태
export type ScheduleStatus =
  | 'scheduled'  // 예정
  | 'completed'  // 완료
  | 'cancelled'  // 취소

// 체크리스트 아이템
export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  due_date?: string
  d_day?: number
}

// 계약 상태
export type ContractStatus =
  | 'pending'
  | 'sent'
  | 'signed'
  | 'rejected'
  | 'expired'

// 사용자 역할
export type UserRole = 'sales' | 'manager' | 'admin'

// ============================================
// Database Tables
// ============================================

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  company_name: string
  brand_name: string | null
  industry: string | null
  store_count: number | null
  ceo_name: string | null
  inquiry_source: InquirySource | null
  interest_product: string | null
  expected_date: string | null
  pipeline_stage: PipelineStage
  failure_reason: string | null
  failure_category: FailureCategory | null
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  client_id: string
  name: string
  position: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  client_id: string
  user_id: string
  activity_type: ActivityType
  description: string | null
  call_duration: number | null
  next_action: string | null
  next_action_date: string | null
  created_at: string
}

export interface EmailTemplate {
  id: string
  user_id: string
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[] | null
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  client_id: string
  version: number
  company_name: string | null
  contact_name: string | null
  contact_info: string | null
  monthly_cost: string | null
  features: string | null
  attachments: Record<string, string>[] | null
  pdf_url: string | null
  html_content: string | null
  created_at: string
}

export interface Document {
  id: string
  client_id: string
  document_type: string | null
  file_name: string | null
  file_url: string | null
  version: number
  created_at: string
}

export interface Contract {
  id: string
  client_id: string
  glosign_doc_id: string | null
  status: ContractStatus
  signed_at: string | null
  created_at: string
}

export interface Reminder {
  id: string
  client_id: string
  user_id: string
  reminder_type: ReminderType | null
  message: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
}

export interface Schedule {
  id: string
  user_id: string
  client_id: string | null
  title: string
  schedule_type: ScheduleType
  description: string | null
  start_date: string
  end_date: string
  all_day: boolean
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  meeting_notes: string | null
  checklist: ChecklistItem[]
  status: ScheduleStatus
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

export interface ScheduleWithClient extends Schedule {
  clients: {
    id: string
    company_name: string
    brand_name: string | null
  } | null
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface ClientWithContacts extends Client {
  contacts: Contact[]
}

export interface ClientWithDetails extends Client {
  contacts: Contact[]
  activity_logs: ActivityLog[]
  proposals: Proposal[]
  documents: Document[]
}

// ============================================
// Form Types
// ============================================

export interface ClientFormData {
  company_name: string
  brand_name?: string
  industry?: string
  store_count?: number
  ceo_name?: string
  inquiry_source?: InquirySource
  interest_product?: string
  expected_date?: string
  notes?: string
  contacts: ContactFormData[]
}

export interface ContactFormData {
  id?: string
  name: string
  position?: string
  email?: string
  phone?: string
  is_primary: boolean
}

export interface CallLogFormData {
  call_duration?: number
  description: string
  next_action?: string
  next_action_date?: string
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
