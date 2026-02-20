'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, ListTodo } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toggleReminderCompletion } from '@/app/dashboard/actions'

interface ReminderItem {
  id: string
  message: string
  due_date: string | null
  is_completed: boolean
  clients: { id: string; company_name: string } | null
}

interface TasksPageContentProps {
  reminders: ReminderItem[]
}

export function TasksPageContent({ reminders }: TasksPageContentProps) {
  const [items, setItems] = useState(reminders)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const getDday = (dueDate: string | null) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))
  }

  const todayItems = useMemo(
    () => items.filter((item) => !item.is_completed && item.due_date && new Date(item.due_date) <= todayStart),
    [items, todayStart]
  )

  const handleToggle = async (id: string, checked: boolean) => {
    setPendingIds((prev) => [...prev, id])
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_completed: checked } : item)))

    const result = await toggleReminderCompletion(id, checked)
    setPendingIds((prev) => prev.filter((target) => target !== id))

    if (result.error) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_completed: !checked } : item)))
      alert(result.error)
    }
  }

  const renderItem = (item: ReminderItem) => {
    const dDay = getDday(item.due_date)

    return (
      <div key={item.id} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <Checkbox
          checked={item.is_completed}
          disabled={pendingIds.includes(item.id)}
          onCheckedChange={(value) => handleToggle(item.id, value === true)}
          className="mt-0.5 h-5 w-5"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {item.message}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {typeof dDay === 'number' && <Badge variant="outline">{dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}</Badge>}
            {item.clients && (
              <Link href={`/clients/${item.clients.id}`} className="text-xs text-blue-600 hover:underline">
                {item.clients.company_name}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            오늘의 할일
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayItems.length > 0 ? todayItems.map(renderItem) : <p className="text-sm text-slate-500">오늘 처리할 할일이 없습니다.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-slate-700" />
            전체 할일
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length > 0 ? items.map(renderItem) : <p className="text-sm text-slate-500">등록된 할일이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
