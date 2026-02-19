'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

// 엑셀 다운로드용 데이터 조회
export async function getClientsForExport() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      contacts (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 엑셀 파일 파싱 및 데이터 변환
export async function parseExcelFile(base64Data: string) {
  try {
    // Base64 디코딩
    const binaryString = atob(base64Data.split(',')[1] || base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // 엑셀 파싱
    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return { data: jsonData, error: null }
  } catch (error) {
    return { data: null, error: '엑셀 파일 파싱 실패' }
  }
}

// 엑셀 데이터 일괄 등록
export async function bulkImportClients(rows: Record<string, unknown>[]) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: 0, failed: 0, error: '인증이 필요합니다.' }

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      // 필수 필드 확인
      const companyName = row['회사명'] || row['company_name']
      if (!companyName) {
        failed++
        errors.push(`회사명 누락`)
        continue
      }

      // 고객 데이터 매핑
      const clientData = {
        user_id: user.id,
        company_name: String(companyName),
        brand_name: row['브랜드명'] || row['brand_name'] || null,
        industry: row['업종'] || row['industry'] || null,
        store_count: row['가맹점수'] || row['store_count'] ? Number(row['가맹점수'] || row['store_count']) : null,
        ceo_name: row['대표자명'] || row['ceo_name'] || null,
        inquiry_source: mapInquirySource(row['문의경로'] || row['inquiry_source']),
        interest_product: row['관심제품'] || row['interest_product'] || null,
        expected_date: row['예상도입시기'] || row['expected_date'] || null,
        notes: row['메모'] || row['notes'] || null,
        pipeline_stage: 'inquiry',
      }

      // 고객 등록
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()

      if (clientError) {
        failed++
        errors.push(`${companyName}: ${clientError.message}`)
        continue
      }

      // 담당자 데이터
      const contactName = row['담당자명'] || row['contact_name']
      if (contactName && client) {
        const contactData = {
          client_id: client.id,
          name: String(contactName),
          position: row['담당자직책'] || row['contact_position'] || null,
          phone: row['담당자전화'] || row['contact_phone'] || null,
          email: row['담당자이메일'] || row['contact_email'] || null,
          is_primary: true,
        }

        await supabase.from('contacts').insert(contactData)
      }

      success++
    } catch (err) {
      failed++
      errors.push(`처리 오류`)
    }
  }

  revalidatePath('/clients')
  return { success, failed, errors: errors.slice(0, 5) }
}

// 문의 경로 매핑
function mapInquirySource(value: unknown): string | null {
  if (!value) return null
  const str = String(value).toLowerCase()
  
  if (str.includes('홈페이지') || str.includes('website')) return 'website'
  if (str.includes('전화') || str.includes('phone')) return 'phone'
  if (str.includes('소개') || str.includes('referral')) return 'referral'
  if (str.includes('전시') || str.includes('exhibition')) return 'exhibition'
  return 'other'
}

// 엑셀 템플릿 컬럼 정보
export async function getExcelTemplateColumns() {
  return [
    { key: 'company_name', label: '회사명', required: true },
    { key: 'brand_name', label: '브랜드명', required: false },
    { key: 'industry', label: '업종', required: false },
    { key: 'store_count', label: '가맹점수', required: false },
    { key: 'ceo_name', label: '대표자명', required: false },
    { key: 'inquiry_source', label: '문의경로', required: false, options: '홈페이지/전화/소개/전시회/기타' },
    { key: 'interest_product', label: '관심제품', required: false },
    { key: 'expected_date', label: '예상도입시기', required: false },
    { key: 'notes', label: '메모', required: false },
    { key: 'contact_name', label: '담당자명', required: false },
    { key: 'contact_position', label: '담당자직책', required: false },
    { key: 'contact_phone', label: '담당자전화', required: false },
    { key: 'contact_email', label: '담당자이메일', required: false },
  ]
}
