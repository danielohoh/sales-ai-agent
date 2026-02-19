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
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react'
import { createProposal, generateProposalData } from '@/app/proposals/actions'

interface Client {
  id: string
  company_name: string
  brand_name?: string
}

interface PricingItem {
  name: string
  quantity: number
  unitPrice: number
  total: number
}

interface ProposalFormProps {
  clients: Client[]
  initialClientId?: string
  proposal?: {
    id: string
    title: string
    content: Record<string, unknown>
  }
}

export function ProposalForm({ clients, initialClientId, proposal }: ProposalFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '')
  const [title, setTitle] = useState(proposal?.title || '')
  
  // 제안서 내용
  const [introduction, setIntroduction] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [solution, setSolution] = useState('')
  const [benefits, setBenefits] = useState<string[]>(['', '', ''])
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { name: '', quantity: 1, unitPrice: 0, total: 0 }
  ])
  const [pricingNotes, setPricingNotes] = useState('')
  const [timeline, setTimeline] = useState('')
  const [support, setSupport] = useState('24시간 고객센터 운영 및 전담 기술지원')

  // 고객 선택 시 기본 데이터 불러오기
  useEffect(() => {
    const loadClientData = async () => {
      if (selectedClientId && !proposal) {
        const result = await generateProposalData(selectedClientId)
        if (result.data) {
          const data = result.data
          setTitle(`${data.company.name} ERP 도입 제안서`)
          setIntroduction(data.sections.introduction)
          setBenefits(data.sections.benefits)
          setSupport(data.sections.support)
        }
      }
    }
    loadClientData()
  }, [selectedClientId, proposal])

  // 가격 항목 추가
  const addPricingItem = () => {
    setPricingItems([...pricingItems, { name: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  // 가격 항목 삭제
  const removePricingItem = (index: number) => {
    if (pricingItems.length === 1) return
    setPricingItems(pricingItems.filter((_, i) => i !== index))
  }

  // 가격 항목 변경
  const updatePricingItem = (index: number, field: keyof PricingItem, value: string | number) => {
    const newItems = [...pricingItems]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // 총액 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice
    }
    
    setPricingItems(newItems)
  }

  // 혜택 항목 변경
  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...benefits]
    newBenefits[index] = value
    setBenefits(newBenefits)
  }

  // 총 금액 계산
  const totalAmount = pricingItems.reduce((sum, item) => sum + item.total, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!selectedClientId) {
      setError('고객을 선택해주세요.')
      setIsLoading(false)
      return
    }

    if (!title) {
      setError('제안서 제목을 입력해주세요.')
      setIsLoading(false)
      return
    }

    const content = {
      introduction,
      problemStatement,
      solution,
      benefits: benefits.filter(b => b.trim()),
      pricing: {
        items: pricingItems.filter(item => item.name.trim()),
        total: totalAmount,
        notes: pricingNotes,
      },
      timeline,
      support,
    }

    try {
      const result = await createProposal({
        client_id: selectedClientId,
        title,
        content,
      })

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/proposals')
      }
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <Link 
        href="/proposals" 
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        목록으로
      </Link>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>제안서를 받을 고객과 제목을 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>고객 선택 *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="고객을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                      {client.brand_name && ` (${client.brand_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>제안서 제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: ABC프랜차이즈 ERP 도입 제안서"
              />
            </div>
          </div>

          {selectedClient && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium">{selectedClient.company_name}</p>
              {selectedClient.brand_name && (
                <p className="text-slate-600">브랜드: {selectedClient.brand_name}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 서론 */}
      <Card>
        <CardHeader>
          <CardTitle>서론</CardTitle>
          <CardDescription>제안서 도입부를 작성하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="고객사의 성공적인 사업 운영을 위한..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* 문제 정의 & 솔루션 */}
      <Card>
        <CardHeader>
          <CardTitle>문제 정의 & 솔루션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>현재 문제점</Label>
            <Textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="고객이 현재 겪고 있는 문제점을 정리하세요."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>제안 솔루션</Label>
            <Textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="문제를 해결할 수 있는 솔루션을 제안하세요."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 기대 효과 */}
      <Card>
        <CardHeader>
          <CardTitle>기대 효과</CardTitle>
          <CardDescription>도입 시 기대되는 효과를 나열하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                placeholder={`기대 효과 ${index + 1}`}
              />
              {index === benefits.length - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setBenefits([...benefits, ''])}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 가격 */}
      <Card>
        <CardHeader>
          <CardTitle>견적</CardTitle>
          <CardDescription>제안 가격을 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricingItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>항목명</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updatePricingItem(index, 'name', e.target.value)}
                  placeholder="예: POS 단말기"
                />
              </div>
              <div className="w-24 space-y-2">
                <Label>수량</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updatePricingItem(index, 'quantity', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="w-32 space-y-2">
                <Label>단가</Label>
                <Input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updatePricingItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="w-32 space-y-2">
                <Label>금액</Label>
                <Input
                  value={item.total.toLocaleString()}
                  readOnly
                  className="bg-slate-50"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePricingItem(index)}
                className="text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addPricingItem}>
            <Plus className="h-4 w-4 mr-2" />
            항목 추가
          </Button>

          <div className="flex justify-end p-4 bg-slate-50 rounded-lg">
            <div className="text-right">
              <p className="text-sm text-slate-500">총 금액</p>
              <p className="text-2xl font-bold">{totalAmount.toLocaleString()}원</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>비고</Label>
            <Textarea
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
              placeholder="부가세 별도, 설치비 포함 등"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 일정 & 지원 */}
      <Card>
        <CardHeader>
          <CardTitle>도입 일정 & 지원</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>예상 도입 일정</Label>
            <Textarea
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="계약 후 2주 내 설치 완료 예정"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>지원 내용</Label>
            <Textarea
              value={support}
              onChange={(e) => setSupport(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          {isLoading ? '저장 중...' : '제안서 저장'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
