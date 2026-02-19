'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  Pencil,
  MessageSquare,
  FileText,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { PIPELINE_STAGES, INQUIRY_SOURCES, ACTIVITY_TYPES } from '@/lib/constants'
import { StageChangeModal } from './StageChangeModal'
import { CallLogModal } from './CallLogModal'
import { MessageLogModal } from './MessageLogModal'
import type { ClientWithDetails, PipelineStage, InquirySource, ActivityType } from '@/types'

interface ClientDetailProps {
  client: ClientWithDetails
}

export function ClientDetail({ client }: ClientDetailProps) {
  const [showStageModal, setShowStageModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showKakaoModal, setShowKakaoModal] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)

  const stageInfo = PIPELINE_STAGES[client.pipeline_stage as PipelineStage]
  const sourceInfo = client.inquiry_source 
    ? INQUIRY_SOURCES[client.inquiry_source as InquirySource]
    : null
  const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0]

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Link 
            href="/clients" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{client.company_name}</h1>
            <Badge className={`${stageInfo?.color} text-white`}>
              {stageInfo?.label}
            </Badge>
          </div>
          {client.brand_name && (
            <p className="text-sm text-slate-500">{client.brand_name}</p>
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCallModal(true)}>
            <Phone className="h-4 w-4 mr-2" />
            통화 기록
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            이메일
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowKakaoModal(true)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            카톡
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSmsModal(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            문자
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowStageModal(true)}>
            단계 변경
          </Button>
          <Link href={`/clients/${client.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="timeline">활동 타임라인</TabsTrigger>
          <TabsTrigger value="documents">문서</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* 회사 정보 */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  회사 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">업종</p>
                  <p className="font-medium">{client.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">가맹점 수</p>
                  <p className="font-medium">{client.store_count ? `${client.store_count}개` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">대표자</p>
                  <p className="font-medium">{client.ceo_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">문의 경로</p>
                  <p className="font-medium">{sourceInfo?.label || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">관심 제품</p>
                  <p className="font-medium">{client.interest_product || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">예상 도입 시기</p>
                  <p className="font-medium">
                    {client.expected_date 
                      ? format(new Date(client.expected_date), 'yyyy년 MM월', { locale: ko })
                      : '-'}
                  </p>
                </div>
                {client.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">메모</p>
                    <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 담당자 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5" />
                  담당자
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.contacts?.map((contact, index) => (
                  <div key={contact.id || index}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contact.name}</p>
                        {contact.is_primary && (
                          <Badge variant="outline" className="text-xs">주담당</Badge>
                        )}
                      </div>
                      {contact.position && (
                        <p className="text-sm text-slate-500">{contact.position}</p>
                      )}
                      {contact.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {contact.phone}
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {(!client.contacts || client.contacts.length === 0) && (
                  <p className="text-slate-500 text-sm">등록된 담당자가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 실패 사유 (실패인 경우만) */}
          {client.pipeline_stage === 'failed' && client.failure_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg text-red-700">실패 사유</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{client.failure_reason}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 활동 타임라인 탭 */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                활동 타임라인
              </CardTitle>
              <CardDescription>고객과의 모든 활동 기록</CardDescription>
            </CardHeader>
            <CardContent>
              {client.activity_logs && client.activity_logs.length > 0 ? (
                <div className="space-y-4">
                  {client.activity_logs
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((log) => {
                      const activityInfo = ACTIVITY_TYPES[log.activity_type as ActivityType]
                      return (
                        <div key={log.id} className="flex gap-4 p-4 border rounded-lg">
                          <div className="text-2xl">{activityInfo?.icon || '📝'}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{activityInfo?.label || log.activity_type}</p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(log.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                              </p>
                            </div>
                            {log.description && (
                              <p className="text-slate-600 mt-1">{log.description}</p>
                            )}
                            {log.call_duration && (
                              <p className="text-sm text-slate-500 mt-1">통화시간: {log.call_duration}분</p>
                            )}
                            {log.next_action && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                <span className="font-medium">다음 액션:</span> {log.next_action}
                                {log.next_action_date && (
                                  <span className="ml-2 text-blue-600">
                                    ({format(new Date(log.next_action_date), 'MM/dd', { locale: ko })})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">
                  아직 활동 기록이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 문서 탭 */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                문서
              </CardTitle>
              <CardDescription>제안서, 견적서, 계약서 등</CardDescription>
            </CardHeader>
            <CardContent>
              {client.proposals && client.proposals.length > 0 ? (
                <div className="space-y-2">
                  {client.proposals.map((proposal) => (
                    <div key={proposal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">제안서 v{proposal.version}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(proposal.created_at), 'yyyy.MM.dd', { locale: ko })}
                        </p>
                      </div>
                      {proposal.pdf_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={proposal.pdf_url} target="_blank" rel="noopener noreferrer">
                            다운로드
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">
                  아직 문서가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 모달들 */}
      {showStageModal && (
        <StageChangeModal
          clientId={client.id}
          currentStage={client.pipeline_stage as PipelineStage}
          onClose={() => setShowStageModal(false)}
        />
      )}

      {showCallModal && (
        <CallLogModal
          clientId={client.id}
          onClose={() => setShowCallModal(false)}
        />
      )}

      {showKakaoModal && (
        <MessageLogModal
          open={showKakaoModal}
          onClose={() => setShowKakaoModal(false)}
          clientId={client.id}
          clientName={client.company_name}
          type="kakao"
        />
      )}

      {showSmsModal && (
        <MessageLogModal
          open={showSmsModal}
          onClose={() => setShowSmsModal(false)}
          clientId={client.id}
          clientName={client.company_name}
          type="sms"
        />
      )}
    </div>
  )
}
