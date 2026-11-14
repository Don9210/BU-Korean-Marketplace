// 고정 값 모음. 화면에서 글자를 직접 쓰지 말고 여기서 가져다 쓴다.
// 값을 바꾸려면 AGENTS.md 의 "고정 값"도 함께 바꾼다.

/** 카테고리 */
export const CATEGORIES = ['가구', '주방용품', '교재', '전자기기', '의류', '기타'] as const
export type Category = (typeof CATEGORIES)[number]

/** 거래 장소 */
export const PLACES = ['GSU 앞', 'Warren Towers 앞', 'Mugar 도서관 앞', '기타'] as const
export type Place = (typeof PLACES)[number]

/** 거래 상태. DB 에는 영어 값으로 저장하고 화면에는 한글로 보여 준다. */
export const STATUSES = ['available', 'reserved', 'completed'] as const
export type ListingStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<ListingStatus, string> = {
  available: '판매중',
  reserved: '예약중',
  completed: '거래완료',
}

/** 사진은 최대 3장 */
export const MAX_IMAGES = 3

/** 가입 가능한 이메일 끝자리 */
export const ALLOWED_EMAIL_DOMAIN = '@bu.edu'

/** 가격 표시: 0 이면 "무료 나눔", 아니면 "$25" */
export function formatPrice(price: number): string {
  return price === 0 ? '무료 나눔' : `$${price.toLocaleString('en-US')}`
}
