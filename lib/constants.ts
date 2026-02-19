import { PipelineStage, InquirySource, FailureCategory, ActivityType, ScheduleType, ScheduleStatus } from '@/types'

// 파이프라인 단계 정보
export const PIPELINE_STAGES: Record<PipelineStage, { label: string; color: string; order: number }> = {
  inquiry: { label: '문의접수', color: 'bg-gray-500', order: 1 },
  called: { label: '전화완료', color: 'bg-blue-500', order: 2 },
  email_sent: { label: '메일전송', color: 'bg-indigo-500', order: 3 },
  meeting: { label: '미팅', color: 'bg-purple-500', order: 4 },
  meeting_followup: { label: '미팅후메일', color: 'bg-pink-500', order: 5 },
  reviewing: { label: '검토', color: 'bg-yellow-500', order: 6 },
  failed: { label: '실패', color: 'bg-red-500', order: 7 },
  on_hold: { label: '보류', color: 'bg-orange-500', order: 8 },
  in_progress: { label: '계약진행중', color: 'bg-cyan-500', order: 9 },
  completed: { label: '계약완료', color: 'bg-green-500', order: 10 },
}

// 일정 유형 정보
export const SCHEDULE_TYPES: Record<ScheduleType, { label: string; color: string; bgColor: string; icon: string }> = {
  meeting: { label: '미팅', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🤝' },
  call: { label: '전화', color: 'text-green-700', bgColor: 'bg-green-100', icon: '📞' },
  demo: { label: '데모', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '💻' },
  contract: { label: '계약', color: 'text-red-700', bgColor: 'bg-red-100', icon: '📝' },
  internal: { label: '내부회의', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '👥' },
  other: { label: '기타', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '📌' },
}

// 일정 상태 정보
export const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; color: string }> = {
  scheduled: { label: '예정', color: 'text-blue-600' },
  completed: { label: '완료', color: 'text-green-600' },
  cancelled: { label: '취소', color: 'text-gray-400' },
}

// 기본 체크리스트 템플릿 (일정 유형별)
export const DEFAULT_CHECKLIST: Record<ScheduleType, string[]> = {
  meeting: ['명함 준비', '제안서/자료 출력', '노트북 충전', '미팅룸 예약 확인'],
  call: ['고객 정보 확인', '이전 통화 내용 확인', '제안 내용 정리'],
  demo: ['데모 환경 점검', '발표 자료 확인', '노트북 충전', '인터넷 연결 확인'],
  contract: ['계약서 준비', '인감/서명 도구 확인', '신분증 지참'],
  internal: ['회의 자료 준비', '안건 정리'],
  other: [],
}

// 칸반 보드에 표시할 단계 (순서대로)
export const KANBAN_STAGES: PipelineStage[] = [
  'inquiry',
  'called',
  'email_sent',
  'meeting',
  'meeting_followup',
  'reviewing',
  'in_progress',
  'completed',
]

// 종료 단계 (칸반에서 별도 처리)
export const END_STAGES: PipelineStage[] = ['failed', 'on_hold']

// 문의 경로 정보
export const INQUIRY_SOURCES: Record<InquirySource, { label: string }> = {
  website: { label: '홈페이지' },
  phone: { label: '전화' },
  referral: { label: '소개' },
  exhibition: { label: '전시회' },
  other: { label: '기타' },
}

// 실패 카테고리 정보
export const FAILURE_CATEGORIES: Record<FailureCategory, { label: string; description: string }> = {
  price: { label: '가격', description: '비용, 예산, ROI 관련' },
  timing: { label: '타이밍', description: '도입 시기, 내부 일정' },
  competitor: { label: '경쟁사', description: '경쟁사 선택' },
  internal: { label: '내부사정', description: '조직 변경, 의사결정 지연' },
  feature: { label: '기능', description: '기능 부족/불일치' },
  other: { label: '기타', description: '기타 사유' },
}

// 활동 유형 정보
export const ACTIVITY_TYPES: Record<ActivityType, { label: string; icon: string }> = {
  call: { label: '통화', icon: '📞' },
  email_sent: { label: '이메일 발송', icon: '📤' },
  email_received: { label: '이메일 수신', icon: '📥' },
  kakao: { label: '카카오톡', icon: '💬' },
  sms: { label: '문자', icon: '💬' },
  meeting: { label: '미팅', icon: '🤝' },
  note: { label: '메모', icon: '📝' },
  stage_change: { label: '단계 변경', icon: '➡️' },
  proposal_sent: { label: '제안서 발송', icon: '📄' },
  contract_sent: { label: '계약서 발송', icon: '📋' },
}

// 이메일 템플릿 유형
export const EMAIL_TEMPLATE_TYPES: Record<string, { label: string; description: string }> = {
  first_response: { label: '최초 문의 회신', description: '첫 문의에 대한 답변' },
  meeting_confirm: { label: '미팅 확정', description: '미팅 일정 확정 안내' },
  meeting_followup: { label: '미팅 후 자료 전달', description: '미팅 후 자료/제안서 발송' },
  proposal_send: { label: '견적서 발송', description: '견적서/제안서 발송' },
  long_term_reminder: { label: '장기 미응답 리마인드', description: '오래 연락 없는 고객 리마인드' },
}

// 네비게이션 메뉴
export const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'LayoutDashboard' },
  { href: '/ai-assistant', label: 'AI 영업 비서', icon: 'Sparkles' },
  { href: '/schedules', label: '일정 관리', icon: 'Calendar' },
  { 
    href: '/clients', 
    label: '고객관리', 
    icon: 'Users',
    children: [
      { href: '/clients', label: '전체 목록' },
      { href: '/clients/kanban', label: '칸반 보드' },
    ]
  },
  { 
    href: '/email', 
    label: '이메일', 
    icon: 'Mail',
    children: [
      { href: '/email/compose', label: '발송' },
      { href: '/email/templates', label: '템플릿' },
    ]
  },
  { href: '/proposals', label: '제안서', icon: 'FileText' },
  { 
    href: '/analytics', 
    label: '분석', 
    icon: 'BarChart3',
    children: [
      { href: '/analytics', label: '리포트' },
      { href: '/analytics/failure', label: '실패 분석' },
    ]
  },
  { href: '/settings', label: '설정', icon: 'Settings' },
]
