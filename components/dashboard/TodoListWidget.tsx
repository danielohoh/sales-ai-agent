'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { toggleReminderCompletion } from '@/app/dashboard/actions'

interface ReminderItem {
  id: string
  message: string
  due_date: string
  clients: { id: string; company_name: string } | null
  is_completed?: boolean
}

interface TodoListWidgetProps {
  reminders: ReminderItem[]
}

export function TodoListWidget({ reminders }: TodoListWidgetProps) {
  const [items, setItems] = useState(reminders)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const getDday = (dueDate: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  }

  const visibleItems = useMemo(() => items.slice(0, 5), [items])

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

  if (visibleItems.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-4">오늘 예정된 할 일이 없습니다.</p>
  }

  return (
    <div className="space-y-3">
      {visibleItems.map((reminder) => {
        const dDay = getDday(reminder.due_date)
        const isPending = pendingIds.includes(reminder.id)

        return (
          <div key={reminder.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
            <Checkbox
              checked={!!reminder.is_completed}
              disabled={isPending}
              onCheckedChange={(value) => handleToggle(reminder.id, value === true)}
              className="mt-0.5"
            />
            <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${reminder.is_completed ? 'line-through text-slate-400' : ''}`}>
                {reminder.message}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}</span>
                {reminder.clients && (
                  <Link href={`/clients/${reminder.clients.id}`} className="text-xs text-blue-600 hover:underline">
                    {reminder.clients.company_name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
