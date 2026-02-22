'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout'
import { useUser } from '@/lib/hooks/useUser'
import { logout, updateProfile, updatePassword } from '@/app/auth/actions'
import { LogOut, User, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const { user } = useUser()
  const displayName = user?.name || '사용자'
  const displayEmail = user?.email || ''

  const [name, setName] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMessage(null)

    const formData = new FormData()
    formData.set('name', name)

    const result = await updateProfile(formData)

    if (result?.error) {
      setProfileMessage({ type: 'error', text: result.error })
    } else {
      setProfileMessage({ type: 'success', text: '프로필이 업데이트되었습니다.' })
      setTimeout(() => window.location.reload(), 1000)
    }
    setProfileLoading(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' })
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' })
      setPasswordLoading(false)
      return
    }

    const formData = new FormData()
    formData.set('password', newPassword)
    formData.set('confirmPassword', confirmPassword)

    const result = await updatePassword(formData)

    if (result?.error) {
      setPasswordMessage({ type: 'error', text: result.error })
    } else {
      setPasswordMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <MainLayout title="설정">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">프로필</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50">
                <span className="text-lg font-bold text-slate-700">{displayName.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">{displayEmail}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>
            {profileMessage && (
              <div className={`p-3 text-sm rounded-lg ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                {profileMessage.text}
              </div>
            )}
            <Button type="submit" disabled={profileLoading} className="w-full">
              {profileLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {profileLoading ? '저장 중...' : '프로필 저장'}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">비밀번호 변경</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6자 이상 입력"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력"
              />
            </div>
            {passwordMessage && (
              <div className={`p-3 text-sm rounded-lg ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                {passwordMessage.text}
              </div>
            )}
            <Button type="submit" disabled={passwordLoading} className="w-full">
              {passwordLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {passwordLoading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Button
            variant="outline"
            className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
