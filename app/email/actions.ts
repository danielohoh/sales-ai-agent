'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { refreshNaverWorksAccessToken, type NaverWorksTokenResponse } from '@/lib/naver-works'

const NAVER_WORKS_PROVIDER = 'naver_works'

type ExternalAuthTokenRow = {
  id: string
  access_token: string | null
  refresh_token: string | null
  token_type: string | null
  scope: string | null
  expires_at: string | null
}

function calcExpiresAt(expiresIn?: number) {
  if (!expiresIn || !Number.isFinite(expiresIn)) return null
  const expiresAt = new Date(Date.now() + Math.max(1, expiresIn - 60) * 1000)
  return expiresAt.toISOString()
}

async function updateStoredNaverWorksToken(
  userId: string,
  token: NaverWorksTokenResponse,
  keepRefreshToken?: string | null
) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('external_auth_tokens')
    .upsert(
      {
        user_id: userId,
        provider: NAVER_WORKS_PROVIDER,
        access_token: token.access_token,
        refresh_token: token.refresh_token || keepRefreshToken || null,
        token_type: token.token_type || null,
        scope: token.scope || null,
        expires_at: calcExpiresAt(token.expires_in),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  if (error) {
    throw new Error(error.message)
  }
}

async function getUserNaverWorksToken(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('external_auth_tokens')
    .select('id, access_token, refresh_token, token_type, scope, expires_at')
    .eq('user_id', userId)
    .eq('provider', NAVER_WORKS_PROVIDER)
    .single()

  if (error) {
    return { data: null as ExternalAuthTokenRow | null, error: error.message }
  }

  return { data: data as ExternalAuthTokenRow, error: null }
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

async function getNaverWorksAccessTokenForUser(userId: string) {
  const tokenRowResult = await getUserNaverWorksToken(userId)
  if (!tokenRowResult.data) {
    return { accessToken: null, error: '네이버웍스 계정 연결이 필요합니다.' }
  }

  const tokenRow = tokenRowResult.data
  if (!isExpired(tokenRow.expires_at) && tokenRow.access_token) {
    return { accessToken: tokenRow.access_token, error: null }
  }

  if (!tokenRow.refresh_token) {
    return { accessToken: null, error: '네이버웍스 토큰이 만료되었습니다. 계정을 다시 연결해주세요.' }
  }

  try {
    const refreshed = await refreshNaverWorksAccessToken(tokenRow.refresh_token)
    await updateStoredNaverWorksToken(userId, refreshed, tokenRow.refresh_token)
    return { accessToken: refreshed.access_token, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : '토큰 갱신 실패'
    return { accessToken: null, error: `네이버웍스 토큰 갱신 실패: ${message}` }
  }
}

async function naverWorksFetch(
  userId: string,
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> } | { ok: false; error: string }> {
  const tokenResult = await getNaverWorksAccessTokenForUser(userId)
  if (tokenResult.error || !tokenResult.accessToken) {
    return { ok: false, error: tokenResult.error || '토큰 발급 실패' }
  }

  const doFetch = async (token: string) =>
    fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
    })

  let res = await doFetch(tokenResult.accessToken)

  if (res.status === 401) {
    const rowResult = await getUserNaverWorksToken(userId)
    if (rowResult.data?.refresh_token) {
      try {
        const refreshed = await refreshNaverWorksAccessToken(rowResult.data.refresh_token)
        await updateStoredNaverWorksToken(userId, refreshed, rowResult.data.refresh_token)
        res = await doFetch(refreshed.access_token)
      } catch {
        return { ok: false, error: '네이버웍스 토큰 갱신 실패. 계정을 다시 연결해주세요.' }
      }
    }
  }

  return res
}

export async function getNaverWorksConnectionStatus() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connected: false, error: '인증이 필요합니다.' }

  const tokenResult = await getUserNaverWorksToken(user.id)
  if (!tokenResult.data) {
    if (tokenResult.error?.includes('relation') || tokenResult.error?.includes('does not exist')) {
      return { connected: false, error: 'external_auth_tokens 테이블이 없습니다. 마이그레이션을 적용해주세요.' }
    }
    return { connected: false, error: null }
  }

  return { connected: true, error: null }
}

// 이메일 템플릿 목록 조회
export async function getEmailTemplates() {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_type', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 이메일 템플릿 상세 조회
export async function getEmailTemplate(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 이메일 템플릿 생성
export async function createEmailTemplate(templateData: {
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[]
}) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert(templateData)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/email')
  return { data, error: null }
}

// 이메일 템플릿 수정
export async function updateEmailTemplate(id: string, templateData: {
  name?: string
  subject?: string
  body?: string
  variables?: string[]
}) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('email_templates')
    .update(templateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/email')
  return { data, error: null }
}

// 이메일 템플릿 삭제
export async function deleteEmailTemplate(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/email')
  return { error: null }
}

// 이메일 발송 기록 저장 (실제 발송은 외부 API 연동 필요)
export async function saveEmailLog(logData: {
  client_id: string
  template_id?: string
  subject: string
  body: string
  to_email: string
}) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // 활동 로그에 기록
  const { error } = await supabase.from('activity_logs').insert({
    client_id: logData.client_id,
    user_id: user.id,
    activity_type: 'email_sent',
    description: `이메일 발송: ${logData.subject}`,
  })

  if (error) return { error: error.message }

  // 마지막 연락일 업데이트
  await supabase
    .from('clients')
    .update({ last_contacted_at: new Date().toISOString() })
    .eq('id', logData.client_id)

  revalidatePath(`/clients/${logData.client_id}`)
  return { error: null }
}

export async function sendEmailViaNaverWorks(payload: {
  client_id: string
  template_id?: string
  to_email: string
  subject: string
  body: string
  content_type?: 'html' | 'text'
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const senderUserId = process.env.NAVER_WORKS_MAIL_SENDER
  if (!senderUserId) {
    return { error: 'NAVER_WORKS_MAIL_SENDER 설정이 필요합니다.' }
  }

  const tokenResult = await getNaverWorksAccessTokenForUser(user.id)
  if (tokenResult.error || !tokenResult.accessToken) {
    return { error: tokenResult.error || '토큰 발급 실패' }
  }

  const sendMailWithToken = async (accessToken: string) => {
    const response = await fetch(`https://www.worksapis.com/v1.0/users/${encodeURIComponent(senderUserId)}/mail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to_email,
        subject: payload.subject,
        body: payload.body,
        contentType: payload.content_type || 'html',
        isSaveSentMail: true,
        isSaveTracking: true,
      }),
    })

    const text = await response.text()
    return { status: response.status, ok: response.ok, text }
  }

  let sendResult = await sendMailWithToken(tokenResult.accessToken)

  if (!sendResult.ok && sendResult.status === 401) {
    const rowResult = await getUserNaverWorksToken(user.id)
    if (rowResult.data?.refresh_token) {
      try {
        const refreshed = await refreshNaverWorksAccessToken(rowResult.data.refresh_token)
        await updateStoredNaverWorksToken(user.id, refreshed, rowResult.data.refresh_token)
        sendResult = await sendMailWithToken(refreshed.access_token)
      } catch {
        return { error: '네이버웍스 액세스 토큰 갱신 후에도 발송하지 못했습니다. 다시 계정을 연결해주세요.' }
      }
    }
  }

  if (!sendResult.ok) {
    return { error: `네이버웍스 메일 발송 실패: ${sendResult.text}` }
  }

  const logResult = await saveEmailLog({
    client_id: payload.client_id,
    template_id: payload.template_id,
    subject: payload.subject,
    body: payload.body,
    to_email: payload.to_email,
  })

  if (logResult.error) {
    return { error: `메일 발송은 성공했지만 로그 저장 실패: ${logResult.error}` }
  }

  return { error: null }
}

// 고객 정보로 템플릿 변수 치환
export async function renderTemplate(templateId: string, clientId: string) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 템플릿 조회
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError) return { data: null, error: templateError.message }

  // 고객 정보 조회
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select(`
      *,
      contacts (*)
    `)
    .eq('id', clientId)
    .single()

  if (clientError) return { data: null, error: clientError.message }

  // 사용자 정보 조회
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const primaryContact = client.contacts?.find((c: { is_primary: boolean }) => c.is_primary) || client.contacts?.[0]

  // 변수 치환
  const variables: Record<string, string> = {
    company_name: client.company_name || '',
    brand_name: client.brand_name || '',
    contact_name: primaryContact?.name || '',
    contact_position: primaryContact?.position || '',
    ceo_name: client.ceo_name || '',
    interest_product: client.interest_product || '',
    sales_name: userData?.name || user.email || '',
    last_contact_type: '통화', // 실제로는 마지막 활동 타입 조회 필요
  }

  let subject = template.subject
  let body = template.body

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  })

  return {
    data: {
      subject,
      body,
      to_email: primaryContact?.email || '',
      to_name: primaryContact?.name || '',
    },
    error: null
  }
}

// ============================================
// Naver Works Mail API Types
// ============================================

export type MailFolder = {
  folderId: string
  folderType: 'S' | 'U'
  folderName: string
  unreadMailCount: number
  mailCount: number
  usage: number
}

export type MailAddress = {
  name: string
  emailAddress: string
}

export type MailItem = {
  mailId: string
  subject: string
  from: MailAddress
  to: MailAddress[]
  cc?: MailAddress[]
  receivedTime: string
  isRead: boolean
  hasAttachment: boolean
  body?: {
    contentType: string
    content: string
  }
}

export type MailListResponse = {
  mails: MailItem[]
  responseMetaData?: {
    nextCursor?: string
  }
}

// ============================================
// Naver Works Mail API — Response Normalization
// ============================================

function normalizeBody(raw: Record<string, unknown>): { contentType: string; content: string } | undefined {
  const b = raw.body
  if (b && typeof b === 'object' && !Array.isArray(b)) {
    const bodyObj = b as Record<string, unknown>
    if (typeof bodyObj.content === 'string' && bodyObj.content) {
      return { contentType: String(bodyObj.contentType || 'text/html'), content: bodyObj.content }
    }
    if (typeof bodyObj.plainText === 'string' && bodyObj.plainText) {
      return { contentType: 'text/plain', content: bodyObj.plainText }
    }
    if (typeof bodyObj.htmlText === 'string' && bodyObj.htmlText) {
      return { contentType: 'text/html', content: bodyObj.htmlText }
    }
    for (const key of Object.keys(bodyObj)) {
      if (typeof bodyObj[key] === 'string' && (bodyObj[key] as string).length > 10) {
        return { contentType: 'text/html', content: bodyObj[key] as string }
      }
    }
  }
  if (typeof b === 'string' && b) return { contentType: 'text/html', content: b }
  if (typeof raw.bodyText === 'string' && raw.bodyText) return { contentType: 'text/plain', content: raw.bodyText as string }
  if (typeof raw.htmlBody === 'string' && raw.htmlBody) return { contentType: 'text/html', content: raw.htmlBody as string }
  if (typeof raw.textBody === 'string' && raw.textBody) return { contentType: 'text/plain', content: raw.textBody as string }
  if (typeof raw.content === 'string' && (raw.content as string).length > 10) return { contentType: 'text/html', content: raw.content as string }

  const allKeys = Object.keys(raw).join(', ')
  const bodyKeys = (b && typeof b === 'object') ? Object.keys(b as object).join(', ') : 'N/A'
  return {
    contentType: 'text/plain',
    content: `[디버그] 본문 필드를 찾을 수 없습니다.\n전체 키: ${allKeys}\nbody 키: ${bodyKeys}`,
  }
}

function normalizeAddress(addr: unknown): MailAddress {
  if (!addr || typeof addr !== 'object') return { name: '', emailAddress: '' }
  const a = addr as Record<string, unknown>
  return {
    name: String(a.name || a.displayName || a.senderName || ''),
    emailAddress: String(a.emailAddress || a.email || a.address || a.mailAddress || ''),
  }
}

function normalizeAddressList(val: unknown): MailAddress[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(normalizeAddress)
  if (typeof val === 'string') return [{ name: '', emailAddress: val }]
  return [normalizeAddress(val)]
}

function normalizeMailItem(raw: Record<string, unknown>, includeBody = false): MailItem {
  return {
    mailId: String(raw.mailId || raw.id || ''),
    subject: String(raw.subject || raw.title || ''),
    from: normalizeAddress(raw.from || raw.sender),
    to: normalizeAddressList(raw.to || raw.recipients || raw.toRecipients),
    cc: normalizeAddressList(raw.cc || raw.ccRecipients),
    receivedTime: String(raw.receivedTime || raw.sentTime || raw.dateTime || raw.date || raw.receivedDate || raw.sentDate || ''),
    isRead: (raw.isRead ?? raw.read ?? false) as boolean,
    hasAttachment: (raw.hasAttachment ?? raw.hasAttachments ?? false) as boolean,
    body: includeBody ? normalizeBody(raw) : undefined,
  }
}

// ============================================
// Naver Works Mail API Actions
// ============================================

// 메일 폴더 목록 조회
export async function getMailFolders() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null as MailFolder[] | null, error: '인증이 필요합니다.' }

  const senderUserId = process.env.NAVER_WORKS_MAIL_SENDER
  if (!senderUserId) {
    return { data: null as MailFolder[] | null, error: 'NAVER_WORKS_MAIL_SENDER 설정이 필요합니다.' }
  }

  const response = await naverWorksFetch(
    user.id,
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(senderUserId)}/mail/mailfolders`
  )

  if ('error' in response) {
    return { data: null as MailFolder[] | null, error: response.error }
  }

  if (!response.ok) {
    const text = await response.text()
    return { data: null as MailFolder[] | null, error: `메일 폴더 조회 실패 (${response.status}): ${text}` }
  }

  const json = await response.json() as Record<string, unknown>
  return { data: (json.mailFolders || []) as MailFolder[], error: null }
}

// 메일 목록 조회
export async function getMailList(
  folderId: string,
  options?: {
    cursor?: string
    count?: number
    searchFilterType?: 'all' | 'mark' | 'attach' | 'tome'
    isUnread?: boolean
  }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null as MailListResponse | null, error: '인증이 필요합니다.' }

  const senderUserId = process.env.NAVER_WORKS_MAIL_SENDER
  if (!senderUserId) {
    return { data: null as MailListResponse | null, error: 'NAVER_WORKS_MAIL_SENDER 설정이 필요합니다.' }
  }

  const params = new URLSearchParams()
  if (options?.count) params.set('count', String(options.count))
  if (options?.cursor) params.set('cursor', options.cursor)
  if (options?.searchFilterType) params.set('searchFilterType', options.searchFilterType)
  if (options?.isUnread !== undefined) params.set('isUnread', String(options.isUnread))

  const queryString = params.toString()
  const url = `https://www.worksapis.com/v1.0/users/${encodeURIComponent(senderUserId)}/mail/mailfolders/${encodeURIComponent(folderId)}/children${queryString ? `?${queryString}` : ''}`

  const response = await naverWorksFetch(user.id, url)

  if ('error' in response) {
    return { data: null as MailListResponse | null, error: response.error }
  }

  if (!response.ok) {
    const text = await response.text()
    return { data: null as MailListResponse | null, error: `메일 목록 조회 실패 (${response.status}): ${text}` }
  }

  const json = await response.json() as Record<string, unknown>
  const rawMails = (json.mails || json.mailList || json.items || json.messages || json.children || []) as Record<string, unknown>[]

  if (!Array.isArray(rawMails) || (rawMails.length === 0 && Object.keys(json).length > 0 && !json.mails && !json.mailList && !json.items)) {
    const keys = Object.keys(json).join(', ')
    return { data: null as MailListResponse | null, error: `메일 응답 키: [${keys}]. 데이터 파싱 확인 필요.` }
  }

  const normalizedMails = rawMails.map((m) => normalizeMailItem(m, false))

  const meta = json.responseMetaData as Record<string, unknown> | undefined
  const paging = json.pagingInfo as Record<string, unknown> | undefined
  const nextCursor =
    meta?.nextCursor || meta?.cursor ||
    paging?.nextCursor || paging?.cursor ||
    json.nextCursor || json.cursor ||
    undefined

  return {
    data: {
      mails: normalizedMails,
      responseMetaData: nextCursor ? { nextCursor: String(nextCursor) } : undefined,
    } as MailListResponse,
    error: null,
  }
}

// 메일 상세 조회
export async function getMailDetail(mailId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null as MailItem | null, error: '인증이 필요합니다.' }

  const senderUserId = process.env.NAVER_WORKS_MAIL_SENDER
  if (!senderUserId) {
    return { data: null as MailItem | null, error: 'NAVER_WORKS_MAIL_SENDER 설정이 필요합니다.' }
  }

  const response = await naverWorksFetch(
    user.id,
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(senderUserId)}/mail/${encodeURIComponent(mailId)}`
  )

  if ('error' in response) {
    return { data: null as MailItem | null, error: response.error }
  }

  if (!response.ok) {
    const text = await response.text()
    return { data: null as MailItem | null, error: `메일 상세 조회 실패 (${response.status}): ${text}` }
  }

  const json = await response.json() as Record<string, unknown>
  const rawMail = json.mailId ? json : ((json.mail || json.message || json.item || null) as Record<string, unknown> | null)

  if (!rawMail) {
    const keys = Object.keys(json).join(', ')
    return { data: null as MailItem | null, error: `메일 상세 응답 키: [${keys}]. 데이터 파싱 확인 필요.` }
  }

  return { data: normalizeMailItem(rawMail, true), error: null }
}

// 메일 삭제
export async function deleteMail(mailId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const senderUserId = process.env.NAVER_WORKS_MAIL_SENDER
  if (!senderUserId) return { error: 'NAVER_WORKS_MAIL_SENDER 설정이 필요합니다.' }

  const response = await naverWorksFetch(
    user.id,
    `https://www.worksapis.com/v1.0/users/${encodeURIComponent(senderUserId)}/mail/${encodeURIComponent(mailId)}`,
    { method: 'DELETE' }
  )

  if ('error' in response) {
    return { error: response.error }
  }

  if (!response.ok) {
    const text = await response.text()
    return { error: `메일 삭제 실패 (${response.status}): ${text}` }
  }

  return { error: null }
}
