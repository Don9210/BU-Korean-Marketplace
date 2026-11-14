import PagePlaceholder from '../components/PagePlaceholder'

// 화면 4 · 목록(홈) — 기능 3
export default function ListPage() {
  return (
    <PagePlaceholder
      number={4}
      title="목록 (홈)"
      file="src/pages/ListPage.tsx"
      todos={[
        '물건 카드 목록 (사진 · 제목 · 가격 · 장소 · 상태), 최신순',
        '카테고리 필터 (lib/constants.ts 의 CATEGORIES)',
        '키워드 검색 (ilike), 가격 낮은 순 정렬',
        '거래완료 글은 회색으로, 맨 아래에',
      ]}
      links={[
        { to: '/listings/sample', label: '상세 화면 (예시 글)' },
        { to: '/login', label: '로그인 화면' },
      ]}
    />
  )
}
