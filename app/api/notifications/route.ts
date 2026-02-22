import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Notification {
  id: string
  type: 'reminder' | 'overdue' | 'schedule'
  title: string
  description: string
  link: string
  time: string | null
}

type RelatedClientRecord = {
  id: string
  company_name: string | null
}

function getRelatedClient(value: unknown): RelatedClientRecord | null {
  if (!value) return null

  if (Array.isArray(value)) {
    const first = value[0]
    if (!first || typeof first !== 'object') return null

    const candidate = first as { id?: unknown; company_name?: unknown }
    if (typeof candidate.id !== 'string') return null

    return {
      id: candidate.id,
      company_name: typeof candidate.company_name === 'string' ? candidate.company_name : null,
    }
  }

  if (typeof value === 'object') {
    const candidate = value as { id?: unknown; company_name?: unknown }
    if (typeof candidate.id !== 'string') return null

    return {
      id: candidate.id,
      company_name: typeof candidate.company_name === 'string' ? candidate.company_name : null,
    }
  }

  return null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)

  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const [remindersResult, clientsResult, schedulesResult] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, message, due_date, reminder_type, clients(id, company_name)')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .lte('due_date', today.toISOString())
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('clients')
      .select('id, company_name, pipeline_stage, last_contacted_at')
      .eq('user_id', user.id)
      .not('pipeline_stage', 'in', '("failed","on_hold","completed")')
      .or(`last_contacted_at.lt.${threeDaysAgo.toISOString()},last_contacted_at.is.null`)
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
      .limit(5),
    supabase
      .from('schedules')
      .select('id, title, start_date, schedule_type, clients(id, company_name)')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('start_date', startOfToday.toISOString())
      .lte('start_date', endOfToday.toISOString())
      .order('start_date', { ascending: true })
      .limit(5),
  ])

  if (remindersResult.error || clientsResult.error || schedulesResult.error) {
    const message = remindersResult.error?.message || clientsResult.error?.message || schedulesResult.error?.message || 'Failed to fetch notifications'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const reminders = (remindersResult.data ?? []).map((reminder) => {
    const client = getRelatedClient(reminder.clients)

    return {
      id: reminder.id,
      type: 'reminder' as const,
      title: reminder.message?.trim() || '리마인더',
      description: client?.company_name || '고객사 정보 없음',
      link: client?.id ? `/clients/${client.id}` : '/clients',
      time: reminder.due_date,
    }
  })

  const overdueClients = (clientsResult.data ?? []).map((client) => {
    let description = '연락 기록 없음'

    if (client.last_contacted_at) {
      const diffMs = now.getTime() - new Date(client.last_contacted_at).getTime()
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      description = `${days}일 전 마지막 연락`
    }

    return {
      id: client.id,
      type: 'overdue' as const,
      title: `${client.company_name} 연락 필요`,
      description,
      link: `/clients/${client.id}`,
      time: client.last_contacted_at,
    }
  })

  const schedules = (schedulesResult.data ?? []).map((schedule) => {
    const client = getRelatedClient(schedule.clients)

    return {
      id: schedule.id,
      type: 'schedule' as const,
      title: schedule.title,
      description: client?.company_name || schedule.schedule_type,
      link: '/schedules',
      time: schedule.start_date,
    }
  })

  const notifications: Notification[] = [...reminders, ...overdueClients, ...schedules].sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return 1
    if (!b.time) return -1
    return new Date(a.time).getTime() - new Date(b.time).getTime()
  })

  return NextResponse.json({
    notifications,
    count: notifications.length,
  })
}
