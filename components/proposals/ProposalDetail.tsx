'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Pencil, 
  Download, 
  Building2,
  User,
  Phone,
  Mail,
  CheckCircle,
} from 'lucide-react'

interface Proposal {
  id: string
  client_id: string
  title: string
  version: number
  status: string
  content: {
    introduction?: string
    problemStatement?: string
    solution?: string
    benefits?: string[]
    pricing?: {
      items?: { name: string; quantity: number; unitPrice: number; total: number }[]
      total?: number
      notes?: string
    }
    timeline?: string
    support?: string
  }
  created_at: string
  clients: {
    id: string
    company_name: string
    brand_name?: string
    industry?: string
    store_count?: number
    ceo_name?: string
    contacts?: { name: string; position?: string; email?: string; phone?: string; is_primary: boolean }[]
  }
}

interface ProposalDetailProps {
  proposal: Proposal
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '작성중', color: 'bg-gray-500' },
  sent: { label: '발송됨', color: 'bg-blue-500' },
  viewed: { label: '열람됨', color: 'bg-green-500' },
  accepted: { label: '수락', color: 'bg-emerald-500' },
  rejected: { label: '거절', color: 'bg-red-500' },
}

export function ProposalDetail({ proposal }: ProposalDetailProps) {
  const { clients: client, content } = proposal
  const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0]
  const statusInfo = STATUS_LABELS[proposal.status] || STATUS_LABELS.draft

  return (
    <div className="max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link 
            href="/proposals" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <Badge variant="outline">v{proposal.version}</Badge>
            <Badge className={`${statusInfo.color} text-white`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-slate-500">
            {format(new Date(proposal.created_at), 'yyyy년 MM월 dd일 작성', { locale: ko })}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={`/proposals/${proposal.id}/edit`} className="w-full sm:w-auto">
            <Button variant="outline" className="min-h-11 w-full sm:w-auto">
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
          <Button className="min-h-11 w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            고객 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">회사명</p>
                <p className="font-medium">
                  <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline">
                    {client.company_name}
                  </Link>
                </p>
              </div>
              {client.brand_name && (
                <div>
                  <p className="text-sm text-slate-500">브랜드</p>
                  <p className="font-medium">{client.brand_name}</p>
                </div>
              )}
              {client.industry && (
                <div>
                  <p className="text-sm text-slate-500">업종</p>
                  <p className="font-medium">{client.industry}</p>
                </div>
              )}
            </div>
            {primaryContact && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{primaryContact.name}</span>
                  {primaryContact.position && (
                    <span className="text-slate-500">{primaryContact.position}</span>
                  )}
                </div>
                {primaryContact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{primaryContact.phone}</span>
                  </div>
                )}
                {primaryContact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{primaryContact.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 서론 */}
      {content.introduction && (
        <Card>
          <CardHeader>
            <CardTitle>서론</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{content.introduction}</p>
          </CardContent>
        </Card>
      )}

      {/* 문제 정의 & 솔루션 */}
      {(content.problemStatement || content.solution) && (
        <Card>
          <CardHeader>
            <CardTitle>문제 정의 & 솔루션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.problemStatement && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">현재 문제점</p>
                <p className="whitespace-pre-wrap">{content.problemStatement}</p>
              </div>
            )}
            {content.solution && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">제안 솔루션</p>
                <p className="whitespace-pre-wrap">{content.solution}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 기대 효과 */}
      {content.benefits && content.benefits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>기대 효과</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {content.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 견적 */}
      {content.pricing && (
        <Card>
          <CardHeader>
            <CardTitle>견적</CardTitle>
          </CardHeader>
          <CardContent>
            {content.pricing.items && content.pricing.items.length > 0 && (
              <div className="mb-4 overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-medium">항목</th>
                      <th className="text-center p-3 font-medium">수량</th>
                      <th className="text-right p-3 font-medium">단가</th>
                      <th className="text-right p-3 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.pricing.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.name}</td>
                        <td className="text-center p-3">{item.quantity}</td>
                        <td className="text-right p-3">{item.unitPrice.toLocaleString()}원</td>
                        <td className="text-right p-3 font-medium">{item.total.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 text-right font-medium">총 금액</td>
                      <td className="p-3 text-right text-lg font-bold text-blue-600">
                        {content.pricing.total?.toLocaleString()}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {content.pricing.notes && (
              <p className="text-sm text-slate-500">{content.pricing.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 도입 일정 & 지원 */}
      {(content.timeline || content.support) && (
        <Card>
          <CardHeader>
            <CardTitle>도입 일정 & 지원</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.timeline && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">예상 도입 일정</p>
                <p className="whitespace-pre-wrap">{content.timeline}</p>
              </div>
            )}
            {content.support && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">지원 내용</p>
                <p className="whitespace-pre-wrap">{content.support}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
