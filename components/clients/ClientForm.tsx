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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { INQUIRY_SOURCES } from '@/lib/constants'
import { createNewClient, updateClient } from '@/app/clients/actions'
import type { Client, ClientFormData, ContactFormData, InquirySource } from '@/types'
import Link from 'next/link'

interface ClientFormProps {
  client?: Client & { contacts: ContactFormData[] }
  isEdit?: boolean
}

export function ClientForm({ client, isEdit = false }: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 폼 상태
  const [formData, setFormData] = useState<ClientFormData>({
    company_name: client?.company_name || '',
    brand_name: client?.brand_name || '',
    industry: client?.industry || '',
    store_count: client?.store_count || undefined,
    ceo_name: client?.ceo_name || '',
    inquiry_source: client?.inquiry_source as InquirySource || undefined,
    interest_product: client?.interest_product || '',
    expected_date: client?.expected_date || '',
    notes: client?.notes || '',
    contacts: client?.contacts || [{ name: '', position: '', email: '', phone: '', is_primary: true }],
  })

  // 대표자와 동일 체크 상태 (각 담당자별)
  const [sameAsCeo, setSameAsCeo] = useState<boolean[]>(
    client?.contacts?.map(() => false) || [false]
  )

  const handleChange = (field: keyof ClientFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 대표자명이 변경되면, "대표자와 동일"이 체크된 담당자들도 업데이트
    if (field === 'ceo_name') {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.map((contact, index) => 
          sameAsCeo[index] 
            ? { ...contact, name: value as string, position: '대표' }
            : contact
        )
      }))
    }
  }

  const handleContactChange = (index: number, field: keyof ContactFormData, value: unknown) => {
    // "대표자와 동일"이 체크된 상태에서 이름/직책 수동 변경 시 체크 해제
    if (sameAsCeo[index] && (field === 'name' || field === 'position')) {
      const newSameAsCeo = [...sameAsCeo]
      newSameAsCeo[index] = false
      setSameAsCeo(newSameAsCeo)
    }

    setFormData(prev => {
      const newContacts = [...prev.contacts]
      newContacts[index] = { ...newContacts[index], [field]: value }
      return { ...prev, contacts: newContacts }
    })
  }

  // 대표자와 동일 토글
  const handleSameAsCeo = (index: number, checked: boolean) => {
    const newSameAsCeo = [...sameAsCeo]
    newSameAsCeo[index] = checked
    setSameAsCeo(newSameAsCeo)

    if (checked && formData.ceo_name) {
      setFormData(prev => {
        const newContacts = [...prev.contacts]
        newContacts[index] = { 
          ...newContacts[index], 
          name: formData.ceo_name || '', 
          position: '대표' 
        }
        return { ...prev, contacts: newContacts }
      })
    }
  }

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', email: '', phone: '', is_primary: false }]
    }))
    setSameAsCeo(prev => [...prev, false])
  }

  const removeContact = (index: number) => {
    if (formData.contacts.length === 1) return
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }))
    setSameAsCeo(prev => prev.filter((_, i) => i !== index))
  }

  const setPrimaryContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => ({ ...c, is_primary: i === index }))
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 유효성 검사
      if (!formData.company_name.trim()) {
        setError('회사명은 필수입니다.')
        setIsLoading(false)
        return
      }

      if (!formData.contacts.some(c => c.name.trim())) {
        setError('담당자 이름은 최소 1명 필요합니다.')
        setIsLoading(false)
        return
      }

      // 빈 담당자 제거
      const cleanedData = {
        ...formData,
        contacts: formData.contacts.filter(c => c.name.trim())
      }

      const result = isEdit && client
        ? await updateClient(client.id, cleanedData)
        : await createNewClient(cleanedData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/clients')
      }
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 뒤로가기 */}
      <Link 
        href="/clients" 
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        목록으로
      </Link>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* 회사 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>회사 정보</CardTitle>
          <CardDescription>고객사의 기본 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">회사명 *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="(주)회사명"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_name">브랜드명</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) => handleChange('brand_name', e.target.value)}
                placeholder="브랜드명"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">업종</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                placeholder="예: 외식업, 카페, 편의점"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_count">가맹점 수</Label>
              <Input
                id="store_count"
                type="number"
                value={formData.store_count || ''}
                onChange={(e) => handleChange('store_count', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ceo_name">대표자명</Label>
              <Input
                id="ceo_name"
                value={formData.ceo_name}
                onChange={(e) => handleChange('ceo_name', e.target.value)}
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry_source">문의 경로</Label>
              <Select
                value={formData.inquiry_source || ''}
                onValueChange={(v) => handleChange('inquiry_source', v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INQUIRY_SOURCES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest_product">관심 제품/서비스</Label>
              <Input
                id="interest_product"
                value={formData.interest_product}
                onChange={(e) => handleChange('interest_product', e.target.value)}
                placeholder="예: POS, 본사관리, 배달연동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_date">예상 도입 시기</Label>
              <Input
                id="expected_date"
                type="date"
                value={formData.expected_date}
                onChange={(e) => handleChange('expected_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="추가 메모사항..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 담당자 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>담당자 정보</CardTitle>
              <CardDescription>고객사 담당자를 등록하세요. (복수 가능)</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <Plus className="h-4 w-4 mr-1" />
              담당자 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.contacts.map((contact, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`primary-${index}`}
                      checked={contact.is_primary}
                      onCheckedChange={() => setPrimaryContact(index)}
                    />
                    <Label htmlFor={`primary-${index}`} className="text-sm">
                      주 담당자
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`same-ceo-${index}`}
                      checked={sameAsCeo[index]}
                      onCheckedChange={(checked) => handleSameAsCeo(index, checked as boolean)}
                      disabled={!formData.ceo_name}
                    />
                    <Label 
                      htmlFor={`same-ceo-${index}`} 
                      className={`text-sm ${!formData.ceo_name ? 'text-slate-400' : ''}`}
                    >
                      대표자와 동일
                    </Label>
                  </div>
                </div>
                {formData.contacts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeContact(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>이름 *</Label>
                  <Input
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    placeholder="홍길동"
                    disabled={sameAsCeo[index]}
                    className={sameAsCeo[index] ? 'bg-slate-100' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>직책</Label>
                  <Input
                    value={contact.position || ''}
                    onChange={(e) => handleContactChange(index, 'position', e.target.value)}
                    placeholder="팀장"
                    disabled={sameAsCeo[index]}
                    className={sameAsCeo[index] ? 'bg-slate-100' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <Input
                    type="email"
                    value={contact.email || ''}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>전화번호</Label>
                  <Input
                    value={contact.phone || ''}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : (isEdit ? '수정하기' : '등록하기')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
