'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Client, ClientFormData, PipelineStage } from '@/types'

// 내 고객 목록 조회
export async function getMyClients() {
  const supabase = await createClient()
  
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

// 고객 상세 조회
export async function getClient(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      contacts (*),
      activity_logs (*),
      proposals (*),
      documents (*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// 고객 등록
export async function createNewClient(formData: ClientFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  // 1. 고객사 등록
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      company_name: formData.company_name,
      brand_name: formData.brand_name || null,
      industry: formData.industry || null,
      store_count: formData.store_count || null,
      ceo_name: formData.ceo_name || null,
      inquiry_source: formData.inquiry_source || null,
      interest_product: formData.interest_product || null,
      expected_date: formData.expected_date || null,
      notes: formData.notes || null,
      pipeline_stage: 'inquiry',
    })
    .select()
    .single()

  if (clientError) return { data: null, error: clientError.message }

  // 2. 담당자 등록
  if (formData.contacts && formData.contacts.length > 0) {
    const contactsToInsert = formData.contacts.map(contact => ({
      client_id: client.id,
      name: contact.name,
      position: contact.position || null,
      email: contact.email || null,
      phone: contact.phone || null,
      is_primary: contact.is_primary,
    }))

    const { error: contactsError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)

    if (contactsError) {
      // 롤백: 고객사 삭제
      await supabase.from('clients').delete().eq('id', client.id)
      return { data: null, error: contactsError.message }
    }
  }

  // 3. 활동 로그 기록
  await supabase.from('activity_logs').insert({
    client_id: client.id,
    user_id: user.id,
    activity_type: 'note',
    description: `${formData.company_name} 신규 등록`,
  })

  revalidatePath('/clients')
  return { data: client, error: null }
}

// 고객 수정
export async function updateClient(id: string, formData: Partial<ClientFormData>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '인증이 필요합니다.' }

  const { data, error } = await supabase
    .from('clients')
    .update({
      company_name: formData.company_name,
      brand_name: formData.brand_name,
      industry: formData.industry,
      store_count: formData.store_count,
      ceo_name: formData.ceo_name,
      inquiry_source: formData.inquiry_source,
      interest_product: formData.interest_product,
      expected_date: formData.expected_date,
      notes: formData.notes,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { data, error: null }
}

// 고객 삭제
export async function deleteClient(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/clients')
  return { error: null }
}

// 파이프라인 단계 변경
export async function updatePipelineStage(
  id: string, 
  stage: PipelineStage,
  failureReason?: string,
  failureCategory?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const updateData: Record<string, unknown> = { pipeline_stage: stage }
  
  if (stage === 'failed' && failureReason) {
    updateData.failure_reason = failureReason
    updateData.failure_category = failureCategory
  }

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    client_id: id,
    user_id: user.id,
    activity_type: 'stage_change',
    description: `파이프라인 단계 변경: ${stage}`,
  })

  revalidatePath('/clients')
  revalidatePath('/clients/kanban')
  return { error: null }
}

// 담당자 추가
export async function addContact(clientId: string, contact: {
  name: string
  position?: string
  email?: string
  phone?: string
  is_primary?: boolean
}) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      client_id: clientId,
      ...contact,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  
  revalidatePath(`/clients/${clientId}`)
  return { data, error: null }
}

// 담당자 삭제
export async function deleteContact(contactId: string, clientId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)

  if (error) return { error: error.message }
  
  revalidatePath(`/clients/${clientId}`)
  return { error: null }
}
