'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserInfo {
  name: string
  email: string
}

export function useUser(): { user: UserInfo | null; loading: boolean } {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          name: user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
          email: user.email || '',
        })
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
