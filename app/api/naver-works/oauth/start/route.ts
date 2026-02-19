import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNaverWorksAuthorizeUrl } from '@/lib/naver-works'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const nextPath = req.nextUrl.searchParams.get('next') || '/email/compose'
  const state = randomUUID()

  let authorizeUrl = ''
  try {
    authorizeUrl = buildNaverWorksAuthorizeUrl(state)
  } catch (error) {
    const message = error instanceof Error ? error.message : '네이버웍스 OAuth 설정 오류'
    return NextResponse.redirect(new URL(`/email/compose?naverWorksError=${encodeURIComponent(message)}`, req.url))
  }

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('naver_works_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  })
  response.cookies.set('naver_works_oauth_next', nextPath, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  })
  return response
}
