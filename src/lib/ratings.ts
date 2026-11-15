import { loadPeople, type Person } from './deals'
import { supabase } from './supabase'
import type { Listing } from './types'

// 기능 6 · 평점에 필요한 DB 요청 모음.
// 평균 평점(rating_avg)과 평가 개수(rating_count)는 DB trigger 가 계산한다. 화면에서 직접 고치지 않는다.

/** 내가 아직 평가하지 않은 확정 거래 한 건 */
export interface DealToRate {
  listing: Listing
  /** 내가 평가할 상대 */
  partner: Person
  /** 그 거래에서 상대의 역할 */
  partnerRole: '판매자' | '구매자'
}

/** 구매자 확인까지 끝난 내 거래 중, 내가 아직 상대를 평가하지 않은 것. */
export async function loadDealsToRate(userId: string): Promise<DealToRate[]> {
  const { data: listingRows, error: listingError } = await supabase.from('listings').select('*')
    .not('buyer_confirmed_at', 'is', null)
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order('buyer_confirmed_at', { ascending: false })
  if (listingError) throw listingError
  const listings = (listingRows as Listing[]).filter((listing) => listing.buyer_id)
  if (listings.length === 0) return []

  const { data: ratingRows, error: ratingError } = await supabase.from('ratings').select('listing_id')
    .eq('rater_id', userId).in('listing_id', listings.map((listing) => listing.id))
  if (ratingError) throw ratingError
  const rated = new Set((ratingRows as { listing_id: string }[]).map((row) => row.listing_id))

  const waiting = listings.filter((listing) => !rated.has(listing.id))
  const partnerIdOf = (listing: Listing) =>
    listing.seller_id === userId ? listing.buyer_id as string : listing.seller_id
  const people = await loadPeople(waiting.map(partnerIdOf))

  return waiting.map((listing) => {
    const partnerId = partnerIdOf(listing)
    return {
      listing,
      partner: people.get(partnerId) ?? { id: partnerId, nickname: null },
      partnerRole: listing.seller_id === userId ? '구매자' : '판매자',
    }
  })
}

/** 상대를 1~5점으로 평가한다. 거래당 한 번만 가능하고, 보낸 뒤에는 고칠 수 없다. */
export async function submitRating(deal: DealToRate, userId: string, score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('별을 1~5개 선택해 주세요.')
  const { error } = await supabase.from('ratings').insert({
    listing_id: deal.listing.id, rater_id: userId, ratee_id: deal.partner.id, score,
  })
  if (!error) return
  if (error.code === '23505') throw new Error('이미 평가한 거래예요.')
  throw new Error('평가를 보내지 못했어요. 다시 시도해 주세요.')
}
