'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ScheduleType, ScheduleStatus, ChecklistItem, ScheduleWithClient } from '@/types'

// 일정 목록 조회
export async function getSchedules(params?: {
  startDate?: string
  endDate?: string
  clientId?: string
  status?: ScheduleStatus
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  let query = supabase
    .from('schedules')
    .select(`
      *,
      clients (
        id,
        company_name,
        brand_name
      )
    `)
    .eq('user_id', user.id)
    .order('start_date', { ascending: true })

  if (params?.startDate) {
    query = query.gte('start_date', params.startDate)
  }

  if (params?.endDate) {
    query = query.lte('start_date', `${params.endDate}T23:59:59`)
  }

  if (params?.clientId) {
    query = query.eq('client_id', params.clientId)
  }

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ScheduleWithClient[], error: null }
}

// 일정 상세 조회
export async function getSchedule(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      clients (
        id,
        company_name,
        brand_name,
        contacts (*)
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// 일정 생성
export async function createSchedule(scheduleData: {
  title: string
  schedule_type: ScheduleType
  description?: string
  start_date: string
  end_date: string
  all_day?: boolean
  client_id?: string
  location?: string
  contact_name?: string
  contact_phone?: string
  checklist?: ChecklistItem[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      user_id: user.id,
      ...scheduleData,
      checklist: scheduleData.checklist || [],
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/schedules')
  revalidatePath('/dashboard')
  return { data, error: null }
}

// 일정 수정
export async function updateSchedule(
  id: string,
  scheduleData: {
    title?: string
    schedule_type?: ScheduleType
    description?: string
    start_date?: string
    end_date?: string
    all_day?: boolean
    client_id?: string | null
    location?: string
    contact_name?: string
    contact_phone?: string
    meeting_notes?: string
    checklist?: ChecklistItem[]
    status?: ScheduleStatus
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .update(scheduleData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/schedules')
  revalidatePath('/dashboard')
  return { data, error: null }
}

// 일정 삭제
export async function deleteSchedule(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/schedules')
  revalidatePath('/dashboard')
  return { error: null }
}

// 일정 완료 처리 (+ 활동 로그 생성)
export async function completeSchedule(id: string, meetingNotes: string, checklist?: ChecklistItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 일정 조회
  const { data: schedule, error: fetchError } = await supabase
    .from('schedules')
    .select('*, clients(company_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !schedule) {
    return { error: '일정을 찾을 수 없습니다.' }
  }

  // 일정 상태 업데이트
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      status: 'completed',
      meeting_notes: meetingNotes,
      ...(checklist ? { checklist } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  // 고객사가 있으면 활동 로그 생성
  if (schedule.client_id) {
    const activityType = schedule.schedule_type === 'call' ? 'call' : 'meeting'
    
    await supabase.from('activity_logs').insert({
      client_id: schedule.client_id,
      user_id: user.id,
      activity_type: activityType,
      description: `[${schedule.title}] ${meetingNotes}`,
    })

    // 마지막 연락일 업데이트
    await supabase
      .from('clients')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', schedule.client_id)
  }

  revalidatePath('/schedules')
  revalidatePath('/dashboard')
  revalidatePath('/clients')
  return { error: null }
}

export async function executeAiScheduleActions(
  scheduleId: string,
  actions: {
    type: 'create_followup_schedule' | 'create_reminder'
    title: string
    days_from_now?: number
    d_day?: number
    description?: string
  }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .single()

  if (scheduleError || !schedule) {
    return { data: null, error: '기준 일정을 찾을 수 없습니다.' }
  }

  const created: Array<{ id: string; type: string; title: string }> = []

  for (const action of actions.slice(0, 5)) {
    if (!action.title?.trim()) continue

    if (action.type === 'create_followup_schedule') {
      const days = Number.isFinite(action.days_from_now) ? Math.max(1, Math.min(30, action.days_from_now as number)) : 1
      const start = new Date()
      start.setDate(start.getDate() + days)
      start.setHours(10, 0, 0, 0)

      const end = new Date(start)
      end.setHours(11, 0, 0, 0)

      const { data: createdSchedule, error } = await supabase
        .from('schedules')
        .insert({
          user_id: user.id,
          client_id: schedule.client_id,
          title: action.title,
          schedule_type: 'meeting',
          description: action.description || 'AI가 미팅 후 후속 업무로 생성한 일정입니다.',
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          location: schedule.location,
          contact_name: schedule.contact_name,
          contact_phone: schedule.contact_phone,
          checklist: [],
          status: 'scheduled',
        })
        .select('id,title')
        .single()

      if (!error && createdSchedule) {
        created.push({ id: createdSchedule.id, type: 'schedule', title: createdSchedule.title })
      }
      continue
    }

    if (action.type === 'create_reminder' && schedule.client_id) {
      const days = Number.isFinite(action.d_day) ? Math.max(0, Math.min(30, action.d_day as number)) : 1
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + days)

      const { data: createdReminder, error } = await supabase
        .from('reminders')
        .insert({
          client_id: schedule.client_id,
          user_id: user.id,
          message: action.title,
          due_date: dueDate.toISOString().split('T')[0],
          is_completed: false,
        })
        .select('id,message')
        .single()

      if (!error && createdReminder) {
        created.push({ id: createdReminder.id, type: 'reminder', title: createdReminder.message || action.title })
      }
    }
  }

  revalidatePath('/schedules')
  revalidatePath('/dashboard')
  revalidatePath('/clients')

  return { data: created, error: null }
}

export async function createRemindersFromAiChecklist(
  scheduleId: string,
  checklist: { text: string; d_day: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, client_id')
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .single()

  if (scheduleError || !schedule) {
    return { data: null, error: '기준 일정을 찾을 수 없습니다.' }
  }

  if (checklist.length === 0) {
    return { data: [], error: null }
  }

  const rows = checklist.slice(0, 20).map((item) => {
    const day = Number.isFinite(item.d_day) ? Math.max(0, Math.min(365, item.d_day)) : 0
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + day)

    return {
      client_id: schedule.client_id,
      user_id: user.id,
      reminder_type: 'custom',
      message: item.text,
      due_date: dueDate.toISOString().split('T')[0],
      is_completed: false,
    }
  })

  const { data, error } = await supabase
    .from('reminders')
    .insert(rows)
    .select('id, message, due_date')

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { data: data || [], error: null }
}

// 오늘 일정 조회
export async function getTodaySchedules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      clients (
        id,
        company_name,
        brand_name
      )
    `)
    .eq('user_id', user.id)
    .gte('start_date', startOfDay)
    .lte('start_date', endOfDay)
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ScheduleWithClient[], error: null }
}

// 이번 주 일정 조회
export async function getThisWeekSchedules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const today = new Date()
  const dayOfWeek = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      clients (
        id,
        company_name,
        brand_name
      )
    `)
    .eq('user_id', user.id)
    .gte('start_date', startOfWeek.toISOString())
    .lte('start_date', endOfWeek.toISOString())
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ScheduleWithClient[], error: null }
}

// 고객사 미팅 히스토리 조회
export async function getClientMeetingHistory(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('start_date', { ascending: false })
    .limit(10)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// 빈 시간대 추천
export async function getAvailableSlots(date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const targetDate = new Date(date)
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString()

  // 해당 날짜의 일정 조회
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('start_date, end_date')
    .eq('user_id', user.id)
    .gte('start_date', startOfDay)
    .lte('start_date', endOfDay)
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

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

  return { data: availableSlots, error: null }
}

// 내일 일정 알림 대상 조회 (AI 비서용)
export async function getTomorrowSchedules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
  const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()

  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      clients (
        id,
        company_name,
        brand_name
      )
    `)
    .eq('user_id', user.id)
    .gte('start_date', startOfTomorrow)
    .lte('start_date', endOfTomorrow)
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ScheduleWithClient[], error: null }
}

// 고객사 목록 조회 (일정 등록용)
export async function getClientsForSchedule() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('clients')
    .select(`
      id,
      company_name,
      brand_name,
      contacts (
        name,
        phone,
        is_primary
      )
    `)
    .eq('user_id', user.id)
    .order('company_name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
