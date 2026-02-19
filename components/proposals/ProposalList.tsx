'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Download,
  FileText,
} from 'lucide-react'
import { deleteProposal } from '@/app/proposals/actions'

interface Proposal {
  id: string
  client_id: string
  title: string
  version: number
  status: string
  created_at: string
  pdf_url: string | null
  clients: {
    company_name: string
    brand_name: string | null
  }
}

interface ProposalListProps {
  proposals: Proposal[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '작성중', color: 'bg-gray-500' },
  sent: { label: '발송됨', color: 'bg-blue-500' },
  viewed: { label: '열람됨', color: 'bg-green-500' },
  accepted: { label: '수락', color: 'bg-emerald-500' },
  rejected: { label: '거절', color: 'bg-red-500' },
}

export function ProposalList({ proposals }: ProposalListProps) {
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 제안서를 삭제하시겠습니까?`)) return
    
    const result = await deleteProposal(id)
    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">
            총 {proposals.length}개의 제안서
          </p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 제안서
          </Button>
        </Link>
      </div>

      {/* 제안서 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제안서명</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>버전</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>아직 제안서가 없습니다.</p>
                    <Link href="/proposals/new">
                      <Button variant="link" className="mt-2">
                        첫 제안서 만들기
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((proposal) => {
                  const statusInfo = STATUS_LABELS[proposal.status] || STATUS_LABELS.draft
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell>
                        <Link 
                          href={`/proposals/${proposal.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {proposal.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/clients/${proposal.client_id}`}
                          className="hover:underline"
                        >
                          {proposal.clients?.company_name}
                          {proposal.clients?.brand_name && (
                            <span className="text-slate-500 text-sm ml-1">
                              ({proposal.clients.brand_name})
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{proposal.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.color} text-white`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {format(new Date(proposal.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/proposals/${proposal.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/proposals/${proposal.id}/edit`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                수정
                              </Link>
                            </DropdownMenuItem>
                            {proposal.pdf_url && (
                              <DropdownMenuItem asChild>
                                <a href={proposal.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  PDF 다운로드
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(proposal.id, proposal.title)}
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
        </CardContent>
      </Card>
    </div>
  )
}
