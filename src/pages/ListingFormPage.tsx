import { useParams } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

// 화면 5 · 글 등록/수정 — 기능 2
// 주소가 /listings/new 이면 등록, /listings/:id/edit 이면 수정이다.
export default function ListingFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  return (
    <PagePlaceholder
      number={5}
      title={isEdit ? '글 수정' : '글 등록'}
      file="src/pages/ListingFormPage.tsx"
      todos={[
        '사진 1~3장 (올리기 전에 브라우저에서 압축)',
        '제목 · 가격(달러 정수, 0 = 무료 나눔) · 카테고리 · 거래 장소 · 설명',
        '"등록" 버튼 → 사진은 Storage, 글은 listings 에 저장',
        '수정일 때는 기존 내용 불러오기, 내 글만 수정·삭제',
      ]}
    />
  )
}
