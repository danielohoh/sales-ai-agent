import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeNaverWorksAuthorizationCode } from '@/lib/naver-works'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const errorDescription = req.nextUrl.searchParams.get('error_description')

  const expectedState = req.cookies.get('naver_works_oauth_state')?.value
  const nextPath = req.cookies.get('naver_works_oauth_next')?.value || '/email/compose'

  const clearAndRedirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url))
    response.cookies.delete('naver_works_oauth_state')
    response.cookies.delete('naver_works_oauth_next')
    return response
  }

  if (error) {
    const message = errorDescription || error
    return clearAndRedirect(`${nextPath}?naverWorksError=${encodeURIComponent(message)}`)
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearAndRedirect(`${nextPath}?naverWorksError=${encodeURIComponent('OAuth state 검증 실패')}`)
  }

  try {
    const token = await exchangeNaverWorksAuthorizationCode(code)
    const expiresAt = token.expires_in
      ? new Date(Date.now() + Math.max(1, token.expires_in - 60) * 1000).toISOString()
      : null

    const { error: upsertError } = await supabase
      .from('external_auth_tokens')
      .upsert(
        {
          user_id: user.id,
          provider: 'naver_works',
          access_token: token.access_token,
          refresh_token: token.refresh_token || null,
          token_type: token.token_type || null,
          scope: token.scope || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )

    if (upsertError) {
      return clearAndRedirect(`${nextPath}?naverWorksError=${encodeURIComponent(upsertError.message)}`)
    }

    return clearAndRedirect(`${nextPath}?naverWorksConnected=1`)
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : '토큰 교환 실패'
    return clearAndRedirect(`${nextPath}?naverWorksError=${encodeURIComponent(message)}`)
  }
}
