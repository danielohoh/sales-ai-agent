'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Send, Copy, Check } from 'lucide-react'
import { renderTemplate, sendEmailViaNaverWorks } from '@/app/email/actions'
import { EMAIL_TEMPLATE_TYPES } from '@/lib/constants'

interface EmailTemplate {
  id: string
  template_type: string
  name: string
  subject: string
  body: string
}

interface Client {
  id: string
  company_name: string
  contacts?: { name: string; email: string; is_primary: boolean }[]
}

interface EmailComposerProps {
  templates: EmailTemplate[]
  clients: Client[]
  initialClientId?: string
  initialTemplateId?: string
  naverWorksConnected?: boolean
  naverWorksError?: string
}

export function EmailComposer({ 
  templates, 
  clients, 
  initialClientId, 
  initialTemplateId,
  naverWorksConnected = false,
  naverWorksError = '',
}: EmailComposerProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || '')
  
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // 고객 선택 시 이메일 주소 자동 입력
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId)
      const primaryContact = client?.contacts?.find(c => c.is_primary) || client?.contacts?.[0]
      if (primaryContact) {
        setToEmail(primaryContact.email || '')
        setToName(primaryContact.name || '')
      }
    }
  }, [selectedClientId, clients])

  // 템플릿 선택 시 내용 렌더링
  useEffect(() => {
    const loadTemplate = async () => {
      if (selectedTemplateId && selectedClientId) {
        setIsLoading(true)
        const result = await renderTemplate(selectedTemplateId, selectedClientId)
        if (result.data) {
          setSubject(result.data.subject)
          setBody(result.data.body)
          if (result.data.to_email) setToEmail(result.data.to_email)
          if (result.data.to_name) setToName(result.data.to_name)
        }
        setIsLoading(false)
      } else if (selectedTemplateId) {
        // 고객이 선택되지 않은 경우 원본 템플릿 표시
        const template = templates.find(t => t.id === selectedTemplateId)
        if (template) {
          setSubject(template.subject)
          setBody(template.body)
        }
      }
    }
    loadTemplate()
  }, [selectedTemplateId, selectedClientId, templates])

  const handleCopyToClipboard = async () => {
    const emailContent = `제목: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(emailContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    if (!selectedClientId) {
      alert('고객을 선택해주세요.')
      return
    }

    if (!toEmail.trim()) {
      alert('수신 이메일 주소를 입력해주세요.')
      return
    }

    setIsLoading(true)
    const result = await sendEmailViaNaverWorks({
      client_id: selectedClientId,
      template_id: selectedTemplateId || undefined,
      to_email: toEmail,
      subject,
      body,
      content_type: 'html',
    })

    if (result.error) {
      alert(`발송 실패: ${result.error}`)
    } else {
      alert('네이버웍스로 메일 발송 및 활동 로그 저장이 완료되었습니다.')
      router.push(`/clients/${selectedClientId}`)
    }
    setIsLoading(false)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="max-w-5xl space-y-6">
      {/* 뒤로가기 */}
      <Link 
        href="/email" 
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        템플릿 목록
      </Link>

      {!naverWorksConnected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-medium">네이버웍스 계정 연결이 필요합니다.</div>
          <div className="mt-1">메일 API는 사용자 OAuth 토큰으로만 발송할 수 있습니다.</div>
          {naverWorksError && <div className="mt-1 text-xs">오류: {naverWorksError}</div>}
          <a
            href="/api/naver-works/oauth/start?next=/email/compose"
            className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            네이버웍스 계정 연결하기
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* 왼쪽: 설정 패널 */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>이메일 설정</CardTitle>
            <CardDescription>고객과 템플릿을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>고객 선택 *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="고객을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>템플릿 선택</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="템플릿을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATE_TYPES).map(([type, { label }]) => {
                    const typeTemplates = templates.filter(t => t.template_type === type)
                    if (typeTemplates.length === 0) return null
                    return (
                      <div key={type}>
                        <div className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100">
                          {label}
                        </div>
                        {typeTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </div>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 선택된 고객 정보 */}
            {selectedClient && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium">{selectedClient.company_name}</p>
                {toName && <p className="text-slate-600">담당자: {toName}</p>}
                {toEmail && <p className="text-slate-600">이메일: {toEmail}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 오른쪽: 이메일 작성 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>이메일 내용</CardTitle>
            <CardDescription>
              템플릿을 선택하면 자동으로 내용이 채워집니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>받는 사람</Label>
                <Input
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="담당자명"
                />
              </div>
              <div className="space-y-2">
                <Label>이메일 주소</Label>
                <Input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="이메일 제목"
              />
            </div>

            <div className="space-y-2">
              <Label>본문</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="이메일 본문"
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button 
                onClick={handleCopyToClipboard}
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={!subject || !body}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    복사됨!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    클립보드에 복사
                  </>
                )}
              </Button>
              <Button 
                onClick={handleSendEmail}
                className="min-h-11 w-full sm:w-auto"
                disabled={isLoading || !selectedClientId || !subject || !naverWorksConnected}
              >
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? '발송 중...' : '네이버웍스로 발송'}
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              * 네이버웍스 메일 API로 직접 발송됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
