'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { EMAIL_TEMPLATE_TYPES } from '@/lib/constants'
import { createEmailTemplate, updateEmailTemplate } from '@/app/email/actions'

interface EmailTemplate {
  id: string
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[]
}

interface EmailTemplateFormProps {
  template?: EmailTemplate
  onSuccess: () => void
}

const AVAILABLE_VARIABLES = [
  { key: 'company_name', label: '회사명' },
  { key: 'brand_name', label: '브랜드명' },
  { key: 'contact_name', label: '담당자명' },
  { key: 'contact_position', label: '담당자 직책' },
  { key: 'ceo_name', label: '대표자명' },
  { key: 'interest_product', label: '관심 제품' },
  { key: 'sales_name', label: '영업담당자명' },
  { key: 'last_contact_type', label: '마지막 연락 유형' },
]

export function EmailTemplateForm({ template, onSuccess }: EmailTemplateFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    template_type: template?.template_type || '',
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const insertVariable = (field: 'subject' | 'body', variable: string) => {
    const input = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement
    if (!input) return

    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const text = formData[field]
    const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)
    
    handleChange(field, newText)
    
    // 커서 위치 복원
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
    }, 0)
  }

  // 본문에서 사용된 변수 추출
  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = text.matchAll(regex)
    return [...new Set([...matches].map(m => m[1]))]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.template_type || !formData.name || !formData.subject || !formData.body) {
      setError('모든 필드를 입력해주세요.')
      setIsLoading(false)
      return
    }

    const variables = extractVariables(formData.subject + formData.body)

    try {
      const result = template
        ? await updateEmailTemplate(template.id, {
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            variables,
          })
        : await createEmailTemplate({
            ...formData,
            variables,
          })

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onSuccess()
      }
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>템플릿 유형 *</Label>
          <Select
            value={formData.template_type}
            onValueChange={(v) => handleChange('template_type', v)}
            disabled={!!template}
          >
            <SelectTrigger>
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMAIL_TEMPLATE_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>템플릿 이름 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="예: 기본 첫 인사 메일"
          />
        </div>
      </div>

      {/* 변수 삽입 버튼 */}
      <div className="space-y-2">
        <Label>변수 삽입</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('body', key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">제목 *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="예: [MSBENTER] {{company_name}} ERP 도입 관련 안내"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">본문 *</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => handleChange('body', e.target.value)}
          placeholder="이메일 본문을 입력하세요. {{변수}}를 사용하여 고객 정보를 자동으로 채울 수 있습니다."
          rows={12}
          className="font-mono text-sm"
        />
      </div>

      {/* 미리보기 */}
      {formData.body && (
        <div className="space-y-2">
          <Label>미리보기</Label>
          <div className="p-4 bg-slate-50 rounded-lg border">
            <p className="font-medium mb-2 text-sm">
              제목: {formData.subject.replace(/\{\{(\w+)\}\}/g, '[$1]')}
            </p>
            <div className="text-sm whitespace-pre-wrap text-slate-600">
              {formData.body.replace(/\{\{(\w+)\}\}/g, '[$1]')}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : (template ? '수정하기' : '생성하기')}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          취소
        </Button>
      </div>
    </form>
  )
}
