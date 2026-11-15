import { supabase } from './supabase'
import type { Listing } from './types'

// 기능 5 · 거래 상태 & 완료 확인에 필요한 DB 요청 모음.
// 누가 무엇을 바꿀 수 있는지는 DB(supabase/schema.sql 의 guard_listing)가 최종 검사한다.
// 여기서는 요청을 보내고, 거절되면 쉬운 말로 바꿔 알려 준다.

/** 닉네임만 필요한 곳에서 쓰는 작은 사용자 정보 */
export interface Person {
  id: string
  nickname: string | null
}

/** DB 가 일부러 거절하며 보낸 한글 안내(raise exception)면 그대로, 아니면 기본 문구를 쓴다. */
function friendlyError(error: { code?: string; message: string }, fallback: string): Error {
  return new Error(error.code === 'P0001' ? error.message : fallback)
}

/** 사용자 id 여러 개의 닉네임을 한 번에 가져온다. */
export async function loadPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)]
  const people = new Map<string, Person>()
  if (unique.length === 0) return people
  const { data, error } = await supabase.from('profiles').select('id, nickname').in('id', unique)
  if (error) throw error
  for (const person of data as Person[]) people.set(person.id, person)
  return people
}

/** 구매자 후보: 이 글에 댓글을 단 사람들(판매자 본인 제외). */
export async function loadBuyerCandidates(listing: Listing): Promise<Person[]> {
  const { data, error } = await supabase.from('comments').select('author_id')
    .eq('listing_id', listing.id).neq('author_id', listing.seller_id)
  if (error) throw error
  const ids = (data as { author_id: string }[]).map((row) => row.author_id)
  const people = await loadPeople(ids)
  return [...people.values()]
}

/** 판매자: 판매중 ↔ 예약중으로 바꾼다. (거래완료는 completeDeal 을 쓴다) */
export async function setListingStatus(
  listing: Listing, userId: string, status: 'available' | 'reserved',
): Promise<Listing> {
  const { data, error } = await supabase.from('listings').update({ status })
    .eq('id', listing.id).eq('seller_id', userId).select('*').maybeSingle()
  if (error) throw friendlyError(error, '상태를 바꾸지 못했어요. 다시 시도해 주세요.')
  const saved = data as Listing | null
  if (!saved) throw new Error('내 글만 상태를 바꿀 수 있어요.')
  // 구매자가 이미 확인한 거래는 DB 가 상태를 그대로 둔다.
  if (saved.status !== status) throw new Error('구매자가 확인한 거래는 상태를 바꿀 수 없어요.')
  return saved
}

/** 판매자: 구매자를 골라 거래완료로 바꾼다. 구매자가 확인하기 전까지는 되돌릴 수 있다. */
export async function completeDeal(listing: Listing, userId: string, buyerId: string): Promise<Listing> {
  const { data, error } = await supabase.from('listings')
    .update({ status: 'completed', buyer_id: buyerId })
    .eq('id', listing.id).eq('seller_id', userId).select('*').maybeSingle()
  if (error) throw friendlyError(error, '거래완료로 바꾸지 못했어요. 다시 시도해 주세요.')
  const saved = data as Listing | null
  if (!saved) throw new Error('내 글만 거래완료로 바꿀 수 있어요.')
  if (saved.buyer_id !== buyerId) throw new Error('구매자가 확인한 거래는 구매자를 바꿀 수 없어요.')
  return saved
}

/** 구매자: "거래를 확인해 주세요" 버튼. 저장되면 DB trigger 가 양쪽 거래 완료 횟수를 +1 한다. */
export async function confirmDeal(listingId: string, userId: string): Promise<Listing> {
  const { data, error } = await supabase.from('listings')
    .update({ buyer_confirmed_at: new Date().toISOString() }) // 실제 시각은 DB 가 정한다
    .eq('id', listingId).eq('buyer_id', userId).eq('status', 'completed').select('*').maybeSingle()
  if (error) throw friendlyError(error, '거래를 확인하지 못했어요. 다시 시도해 주세요.')
  const saved = data as Listing | null
  if (!saved?.buyer_confirmed_at) {
    throw new Error('확인할 수 없는 거래예요. 판매자가 거래완료를 취소했을 수 있어요.')
  }
  return saved
}

/** 구매자: 내가 구매자로 선택됐지만 아직 확인하지 않은 거래 목록. */
export async function loadDealsToConfirm(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase.from('listings').select('*')
    .eq('buyer_id', userId).eq('status', 'completed').is('buyer_confirmed_at', null)
    .order('seller_completed_at', { ascending: false })
  if (error) throw error
  return data as Listing[]
}
