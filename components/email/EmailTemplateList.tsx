'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Mail, 
  Plus, 
  Eye, 
  Pencil, 
  Trash2,
  Phone,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { EMAIL_TEMPLATE_TYPES } from '@/lib/constants'
import { deleteEmailTemplate } from '@/app/email/actions'
import { EmailTemplateForm } from './EmailTemplateForm'
import { EmailPreview } from './EmailPreview'

interface EmailTemplate {
  id: string
  template_type: string
  name: string
  subject: string
  body: string
  variables: string[]
  created_at: string
}

interface EmailTemplateListProps {
  templates: EmailTemplate[]
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  first_response: <Mail className="h-5 w-5" />,
  meeting_confirm: <Calendar className="h-5 w-5" />,
  meeting_followup: <MessageSquare className="h-5 w-5" />,
  proposal_send: <FileText className="h-5 w-5" />,
  long_term_reminder: <Clock className="h-5 w-5" />,
}

export function EmailTemplateList({ templates }: EmailTemplateListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) return
    
    const result = await deleteEmailTemplate(id)
    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
    }
  }

  // 타입별로 그룹화
  const groupedTemplates = templates.reduce((acc, template) => {
    const type = template.template_type
    if (!acc[type]) acc[type] = []
    acc[type].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">
            상황별 이메일 템플릿을 관리하세요. 변수를 사용하여 자동으로 고객 정보가 채워집니다.
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 템플릿
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 이메일 템플릿</DialogTitle>
              <DialogDescription>
                새로운 이메일 템플릿을 만듭니다.
              </DialogDescription>
            </DialogHeader>
            <EmailTemplateForm onSuccess={() => setShowCreateModal(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* 사용 가능한 변수 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800 font-medium mb-2">📌 사용 가능한 변수</p>
          <div className="flex flex-wrap gap-2">
            {['company_name', 'brand_name', 'contact_name', 'contact_position', 'ceo_name', 'interest_product', 'sales_name', 'last_contact_type'].map(v => (
              <code key={v} className="px-2 py-1 bg-white rounded text-xs text-blue-700">
                {`{{${v}}}`}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 목록 */}
      {Object.entries(EMAIL_TEMPLATE_TYPES).map(([type, { label, description }]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2">
            {TEMPLATE_ICONS[type] || <Mail className="h-5 w-5" />}
            <h2 className="font-semibold text-lg">{label}</h2>
            <span className="text-sm text-slate-500">- {description}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(groupedTemplates[type] || []).map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="outline">{EMAIL_TEMPLATE_TYPES[type as keyof typeof EMAIL_TEMPLATE_TYPES]?.label}</Badge>
                  </div>
                  <CardDescription className="truncate">
                    제목: {template.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                    {template.body.substring(0, 100)}...
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      미리보기
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(template.id, template.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 템플릿이 없는 경우 */}
            {(!groupedTemplates[type] || groupedTemplates[type].length === 0) && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-slate-500">
                  <p>이 유형의 템플릿이 없습니다.</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setShowCreateModal(true)}
                  >
                    템플릿 추가하기
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}

      {/* 수정 모달 */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 수정</DialogTitle>
            <DialogDescription>
              이메일 템플릿을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <EmailTemplateForm 
              template={editingTemplate} 
              onSuccess={() => setEditingTemplate(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 미리보기</DialogTitle>
            <DialogDescription>
              실제 발송 시 변수가 고객 정보로 치환됩니다.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <EmailPreview template={previewTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
