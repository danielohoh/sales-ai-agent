'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2,
  Phone,
  Upload,
  Download,
} from 'lucide-react'
import { PIPELINE_STAGES, INQUIRY_SOURCES } from '@/lib/constants'
import type { ClientWithContacts, PipelineStage, InquirySource } from '@/types'
import { deleteClient } from '@/app/clients/actions'
import { ExcelUploadModal } from './ExcelUploadModal'

interface ClientListProps {
  clients: ClientWithContacts[]
}

export function ClientList({ clients }: ClientListProps) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // 필터링
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.company_name.toLowerCase().includes(search.toLowerCase()) ||
      client.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
      client.contacts?.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
    
    const matchesStage = stageFilter === 'all' || client.pipeline_stage === stageFilter
    const matchesSource = sourceFilter === 'all' || client.inquiry_source === sourceFilter
    
    return matchesSearch && matchesStage && matchesSource
  })

  const handleDelete = async (id: string, companyName: string) => {
    if (!confirm(`"${companyName}" 고객을 삭제하시겠습니까?`)) return
    
    const result = await deleteClient(id)
    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
    }
  }

  const getPrimaryContact = (client: ClientWithContacts) => {
    return client.contacts?.find(c => c.is_primary) || client.contacts?.[0]
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    // 다운로드할 데이터 준비
    const headers = ['회사명', '브랜드명', '업종', '가맹점수', '대표자명', '문의경로', '관심제품', '파이프라인', '담당자명', '담당자직책', '담당자전화', '담당자이메일', '등록일', '최근연락']
    
    const rows = filteredClients.map(client => {
      const contact = getPrimaryContact(client)
      const stageInfo = PIPELINE_STAGES[client.pipeline_stage as PipelineStage]
      const sourceInfo = client.inquiry_source ? INQUIRY_SOURCES[client.inquiry_source as InquirySource] : null
      
      return [
        client.company_name,
        client.brand_name || '',
        client.industry || '',
        client.store_count || '',
        client.ceo_name || '',
        sourceInfo?.label || '',
        client.interest_product || '',
        stageInfo?.label || '',
        contact?.name || '',
        contact?.position || '',
        contact?.phone || '',
        contact?.email || '',
        format(new Date(client.created_at), 'yyyy-MM-dd'),
        client.last_contacted_at ? format(new Date(client.last_contacted_at), 'yyyy-MM-dd') : '',
      ]
    })

    // CSV 생성
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `고객목록_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 필터 및 버튼 */}
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="회사명, 담당자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="파이프라인" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 단계</SelectItem>
            {Object.entries(PIPELINE_STAGES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="문의 경로" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 경로</SelectItem>
            {Object.entries(INQUIRY_SOURCES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 엑셀 버튼들 */}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          <Button variant="outline" size="sm" className="min-h-11 w-full sm:w-auto" onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-1" />
            엑셀 업로드
          </Button>
          <Button variant="outline" size="sm" className="min-h-11 w-full sm:w-auto" onClick={handleExcelDownload}>
            <Download className="h-4 w-4 mr-1" />
            엑셀 다운로드
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>회사명</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>파이프라인</TableHead>
              <TableHead>문의 경로</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead>최근 연락</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                  {clients.length === 0 
                    ? '등록된 고객이 없습니다. 새 고객을 등록해주세요.'
                    : '검색 결과가 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => {
                const primaryContact = getPrimaryContact(client)
                const stageInfo = PIPELINE_STAGES[client.pipeline_stage as PipelineStage]
                const sourceInfo = client.inquiry_source 
                  ? INQUIRY_SOURCES[client.inquiry_source as InquirySource]
                  : null

                return (
                  <TableRow key={client.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Link 
                        href={`/clients/${client.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {client.company_name}
                      </Link>
                      {client.brand_name && (
                        <p className="text-xs text-slate-500">{client.brand_name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {primaryContact ? (
                        <div>
                          <p className="text-sm font-medium">{primaryContact.name}</p>
                          <div className="flex gap-2 text-xs text-slate-500">
                            {primaryContact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {primaryContact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${stageInfo?.color} text-white`}>
                        {stageInfo?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sourceInfo?.label || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(client.created_at), 'yyyy.MM.dd', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {client.last_contacted_at 
                        ? format(new Date(client.last_contacted_at), 'yyyy.MM.dd', { locale: ko })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              상세보기
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(client.id, client.company_name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-[0.8125rem] text-slate-500">
        {filteredClients.length}개의 결과
      </p>

      {/* 엑셀 업로드 모달 */}
      <ExcelUploadModal 
        open={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
      />
    </div>
  )
}
