import { useParams } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

// 화면 6 · 상세(+비밀댓글) — 기능 4, 5
export default function ListingDetailPage() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      number={6}
      title="상세"
      file="src/pages/ListingDetailPage.tsx"
      todos={[
        `글 불러오기 (지금 주소의 글 id: ${id})`,
        '사진 · 제목 · 가격 · 설명, 판매자 닉네임 · 인증 뱃지 · 거래 완료 횟수 · 평점',
        '비밀댓글: 글쓴이와 댓글 작성자만 보임. 한 댓글 아래에서 답글 여러 번 주고받기',
        '댓글 입력란 안내 문구: "댓글은 판매자와 나만 볼 수 있어요"',
        '내 글이면: 수정 · 삭제 · 상태 변경(판매중/예약중/거래완료), 완료 시 구매자 선택',
      ]}
      links={[{ to: `/listings/${id}/edit`, label: '이 글 수정 화면' }]}
    />
  )
}
