import PagePlaceholder from '../components/PagePlaceholder'
import MyListings from '../components/MyListings'

// 화면 7 · 내 활동 — 기능 5, 6
export default function MyActivityPage() {
  return (
    <>
    <MyListings />
    <PagePlaceholder
      number={7}
      title="내 활동"
      file="src/pages/MyActivityPage.tsx"
      todos={[
        '내 프로필: 닉네임 · 평균 평점(없으면 "아직 평가 없음") · 거래 완료 횟수',
        '내 글 목록',
        '내가 댓글 단 글 목록',
        '확인 대기 거래: "거래를 확인해 주세요" → buyer_confirmed_at 저장',
        '평가할 거래: 상대를 1~5점 평가 (거래당 1회)',
        '로그아웃 버튼',
      ]}
    />
    </>
  )
}
