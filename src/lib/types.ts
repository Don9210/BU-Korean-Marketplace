import type { Category, ListingStatus, Place } from './constants'

// DB 테이블 4개의 한 줄(행) 모양. supabase/schema.sql 과 똑같이 맞춘다.

export interface Profile {
  id: string
  email: string
  nickname: string | null // 첫 로그인 직후에는 아직 없다
  rating_avg: number | null // 평점이 없으면 null → "아직 평가 없음"
  rating_count: number
  completed_count: number
  created_at: string
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  price: number // 달러 정수. 0 = 무료 나눔
  category: Category
  place: Place
  description: string
  image_urls: string[]
  status: ListingStatus
  buyer_id: string | null
  seller_completed_at: string | null
  buyer_confirmed_at: string | null
  reported: boolean
  created_at: string
}

export interface Comment {
  id: string
  listing_id: string
  author_id: string
  parent_id: string | null // null 이면 댓글, 값이 있으면 그 댓글의 답글
  body: string
  created_at: string
}

export interface Rating {
  id: string
  listing_id: string
  rater_id: string // 평가한 사람
  ratee_id: string // 평가받은 사람
  score: number // 1~5
  created_at: string
}
