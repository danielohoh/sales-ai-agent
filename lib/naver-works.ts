const NAVER_WORKS_AUTH_BASE = 'https://auth.worksmobile.com/oauth2/v2.0'

export interface NaverWorksTokenResponse {
  access_token: string
  refresh_token?: string
  token_type?: string
  scope?: string
  expires_in?: number
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`)
  }
  return value
}

export function getNaverWorksOAuthConfig() {
  return {
    clientId: getRequiredEnv('NAVER_WORKS_CLIENT_ID'),
    clientSecret: getRequiredEnv('NAVER_WORKS_CLIENT_SECRET'),
    redirectUri: getRequiredEnv('NAVER_WORKS_REDIRECT_URI'),
    scope: process.env.NAVER_WORKS_SCOPE || 'mail',
  }
}

export function buildNaverWorksAuthorizeUrl(state: string) {
  const { clientId, redirectUri, scope } = getNaverWorksOAuthConfig()
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  })
  return `${NAVER_WORKS_AUTH_BASE}/authorize?${query.toString()}`
}

async function requestToken(params: URLSearchParams) {
  const response = await fetch(`${NAVER_WORKS_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const responseText = await response.text()
  let json: Record<string, unknown> = {}
  try {
    json = JSON.parse(responseText)
  } catch {
    json = {}
  }

  if (!response.ok) {
    throw new Error(`네이버웍스 토큰 요청 실패: ${responseText}`)
  }

  if (!json.access_token || typeof json.access_token !== 'string') {
    throw new Error('네이버웍스 토큰 응답이 유효하지 않습니다.')
  }

  return json as unknown as NaverWorksTokenResponse
}

export async function exchangeNaverWorksAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri, scope } = getNaverWorksOAuthConfig()

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    scope,
  })

  return requestToken(params)
}

export async function refreshNaverWorksAccessToken(refreshToken: string) {
  const { clientId, clientSecret, scope } = getNaverWorksOAuthConfig()

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope,
  })

  return requestToken(params)
}
