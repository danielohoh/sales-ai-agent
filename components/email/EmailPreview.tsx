'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmailTemplate {
  id: string
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[]
}

interface EmailPreviewProps {
  template: EmailTemplate
}

// 샘플 데이터로 변수 치환
const SAMPLE_DATA: Record<string, string> = {
  company_name: '(주)맛나푸드',
  brand_name: '맛나치킨',
  contact_name: '김철수',
  contact_position: '팀장',
  ceo_name: '박대표',
  interest_product: 'POS + 본사관리 시스템',
  sales_name: '김상현',
  last_contact_type: '전화',
}

export function EmailPreview({ template }: EmailPreviewProps) {
  const renderWithSampleData = (text: string) => {
    let result = text
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(regex, `<span class="bg-yellow-100 px-1 rounded">${value}</span>`)
    })
    return result
  }

  return (
    <div className="space-y-4">
      {/* 사용된 변수 목록 */}
      {template.variables && template.variables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500">사용된 변수:</span>
          {template.variables.map(v => (
            <Badge key={v} variant="secondary">{v}</Badge>
          ))}
        </div>
      )}

      {/* 이메일 미리보기 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* 제목 */}
            <div className="border-b pb-3">
              <p className="text-sm text-slate-500 mb-1">제목</p>
              <p 
                className="font-medium"
                dangerouslySetInnerHTML={{ 
                  __html: renderWithSampleData(template.subject) 
                }}
              />
            </div>

            {/* 본문 */}
            <div>
              <p className="text-sm text-slate-500 mb-2">본문</p>
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: renderWithSampleData(template.body) 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 샘플 데이터 안내 */}
      <p className="text-xs text-slate-400 text-center">
        노란색 하이라이트는 샘플 데이터입니다. 실제 발송 시 고객 정보로 치환됩니다.
      </p>
    </div>
  )
}
