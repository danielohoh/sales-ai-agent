'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 제안서 목록 조회
export async function getProposals() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      clients (company_name, brand_name)
    `)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 제안서 상세 조회
export async function getProposal(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      clients (
        id,
        company_name, 
        brand_name, 
        industry,
        store_count,
        ceo_name,
        interest_product,
        contacts (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 제안서 생성
export async function createProposal(proposalData: {
  client_id: string
  title: string
  content: Record<string, unknown>
}) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 해당 고객의 기존 제안서 버전 확인
  const { data: existingProposals } = await supabase
    .from('proposals')
    .select('version')
    .eq('client_id', proposalData.client_id)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (existingProposals?.[0]?.version || 0) + 1

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      ...proposalData,
      version: nextVersion,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    client_id: proposalData.client_id,
    user_id: user.id,
    activity_type: 'proposal_sent',
    description: `제안서 v${nextVersion} 생성`,
  })

  revalidatePath('/proposals')
  revalidatePath(`/clients/${proposalData.client_id}`)
  return { data, error: null }
}

// 제안서 수정
export async function updateProposal(id: string, proposalData: {
  title?: string
  content?: Record<string, unknown>
  status?: string
}) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('proposals')
    .update(proposalData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/proposals')
  return { data, error: null }
}

// 제안서 삭제
export async function deleteProposal(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/proposals')
  return { error: null }
}

// 고객별 제안서 데이터 생성 (기본 템플릿 데이터)
export async function generateProposalData(clientId: string) {
  const supabase = await createServerClient()
  
  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      contacts (*)
    `)
    .eq('id', clientId)
    .single()

  if (error) return { data: null, error: error.message }

  const primaryContact = client.contacts?.find((c: { is_primary: boolean }) => c.is_primary) || client.contacts?.[0]

  // 기본 제안서 데이터 구조
  const proposalData = {
    company: {
      name: client.company_name,
      brand: client.brand_name || '',
      industry: client.industry || '',
      storeCount: client.store_count || 0,
      ceoName: client.ceo_name || '',
    },
    contact: {
      name: primaryContact?.name || '',
      position: primaryContact?.position || '',
      email: primaryContact?.email || '',
      phone: primaryContact?.phone || '',
    },
    products: client.interest_product?.split(',').map((p: string) => p.trim()) || [],
    sections: {
      introduction: `${client.company_name}의 성공적인 사업 운영을 위한 최적의 솔루션을 제안드립니다.`,
      problemStatement: '',
      solution: '',
      benefits: [
        '실시간 매출/재고 관리로 본사-가맹점 데이터 통합',
        '배달앱 자동 연동으로 주문 누락 방지',
        '직관적인 UI로 빠른 직원 교육',
      ],
      pricing: {
        items: [],
        total: 0,
        notes: '',
      },
      timeline: '',
      support: '24시간 고객센터 운영 및 전담 기술지원',
    },
    createdAt: new Date().toISOString(),
  }

  return { data: proposalData, error: null }
}
