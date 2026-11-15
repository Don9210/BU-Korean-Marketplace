import { useState } from 'react'
import DealsToConfirm from '../components/DealsToConfirm'
import DealsToRate from '../components/DealsToRate'
import MyListings from '../components/MyListings'
import MyProfileCard from '../components/MyProfileCard'

// 화면 7 · 내 활동 — 기능 5, 6
export default function MyActivityPage() {
  // 거래를 확인하면 +1. 내 프로필(완료 횟수)과 평가할 거래 목록이 이 값을 보고 새로 고친다.
  const [confirmedCount, setConfirmedCount] = useState(0)

  return (
    <>
      <MyProfileCard refreshKey={confirmedCount} />
      <DealsToConfirm onConfirmed={() => setConfirmedCount((count) => count + 1)} />
      <DealsToRate refreshKey={confirmedCount} />
      <MyListings />
      {/* TODO(기능 4): "내가 댓글 단 글" 목록을 여기에 추가한다. 댓글 기능이 만들어진 뒤에 가능. */}
    </>
  )
}
