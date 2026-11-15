interface Props {
  /** profiles.rating_avg — 평가가 없으면 null */
  ratingAvg: number | null
  /** profiles.rating_count */
  ratingCount: number
  className?: string
}

/**
 * 기능 6 · 평균 평점 한 줄 표시. 평가가 없으면 "아직 평가 없음".
 * 프로필을 보여 주는 곳 어디서나 쓴다. (내 활동, 상세 화면의 판매자 정보)
 *   <RatingSummary ratingAvg={profile.rating_avg} ratingCount={profile.rating_count} />
 */
export default function RatingSummary({ ratingAvg, ratingCount, className = '' }: Props) {
  if (ratingAvg === null || ratingCount === 0) {
    return <span className={`text-sm text-gray-500 ${className}`}>아직 평가 없음</span>
  }
  // DB 의 numeric 값은 글자("4.50")로 올 수 있어서 숫자로 바꾼 뒤 소수 첫째 자리까지 보여 준다.
  const average = Number(ratingAvg).toFixed(1)
  return (
    <span className={`text-sm text-gray-800 ${className}`}>
      <span aria-hidden="true" className="text-amber-500">★</span>{' '}
      <span className="font-semibold">{average}</span>
      <span className="text-gray-500"> · 평가 {ratingCount}개</span>
      <span className="sr-only"> (5점 만점에 {average}점)</span>
    </span>
  )
}
