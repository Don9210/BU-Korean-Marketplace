import { useCallback, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import DealsToConfirm from '../components/DealsToConfirm'
import DealsToRate from '../components/DealsToRate'
import { IconChat, IconCheckCircle, IconStar, IconTag } from '../components/icons'
import MyCommentedListings from '../components/MyCommentedListings'
import MyListings from '../components/MyListings'
import MyProfileCard from '../components/MyProfileCard'

// 화면 7 · 내 활동 — 기능 5, 6 (+ 기능 4 내가 댓글 단 글)
// 맨 위 "한눈에 보기" 칸 4개가 아래 4구역의 개수를 보여 주고, 누르면 그 구역으로 내려간다.

type SectionId = 'confirm' | 'rate' | 'selling' | 'commented'

const SECTIONS: {
  id: SectionId
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** 0보다 크면 "할 일"이라 빨간색으로 강조한다 */
  todo: boolean
}[] = [
  { id: 'confirm', label: '확인 대기', Icon: IconCheckCircle, todo: true },
  { id: 'rate', label: '평가 대기', Icon: IconStar, todo: true },
  { id: 'selling', label: '내 판매 글', Icon: IconTag, todo: false },
  { id: 'commented', label: '댓글 단 글', Icon: IconChat, todo: false },
]

export default function MyActivityPage() {
  // 거래를 확인하면 +1. 내 프로필(완료 횟수)과 평가할 거래 목록이 이 값을 보고 새로 고친다.
  const [confirmedCount, setConfirmedCount] = useState(0)
  // 각 구역이 불러온 개수. null = 아직 불러오는 중
  const [counts, setCounts] = useState<Record<SectionId, number | null>>({
    confirm: null, rate: null, selling: null, commented: null,
  })

  const report = useCallback((id: SectionId, count: number) => {
    setCounts((current) => (current[id] === count ? current : { ...current, [id]: count }))
  }, [])
  // 구역마다 바뀌지 않는 함수를 하나씩 넘겨서, 개수가 바뀔 때만 다시 알려 오게 한다.
  const onCount = useMemo(() => ({
    confirm: (count: number) => report('confirm', count),
    rate: (count: number) => report('rate', count),
    selling: (count: number) => report('selling', count),
    commented: (count: number) => report('commented', count),
  }), [report])

  function scrollTo(id: SectionId) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <MyProfileCard refreshKey={confirmedCount} />

      {/* 한눈에 보기: 4구역 개수 */}
      <nav aria-label="내 활동 한눈에 보기" className="grid grid-cols-4 gap-2 border-b border-gray-100 px-4 py-4 md:px-6">
        {SECTIONS.map(({ id, label, Icon, todo }) => {
          const count = counts[id]
          const urgent = todo && (count ?? 0) > 0
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              aria-label={`${label} ${count ?? '불러오는 중'}${count === null ? '' : '개'}, 그 구역으로 이동`}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 transition-colors ${
                urgent ? 'bg-red-50 active:bg-red-100' : 'bg-gray-50 active:bg-gray-100'
              }`}
            >
              <Icon className={`h-6 w-6 ${urgent ? 'text-brand' : 'text-gray-500'}`} />
              <span className={`text-xl font-bold leading-none ${urgent ? 'text-brand' : 'text-gray-900'}`}>
                {count ?? '–'}
              </span>
              <span className="text-xs text-gray-600">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* 넓은 화면에서는 묶음을 2칸으로 나란히 둔다 */}
      <div className="md:grid md:grid-cols-2 md:items-start md:[&>*:nth-child(odd)]:border-r md:[&>*:nth-child(odd)]:border-gray-100">
        <DealsToConfirm id="confirm" onCount={onCount.confirm} onConfirmed={() => setConfirmedCount((count) => count + 1)} />
        <DealsToRate id="rate" onCount={onCount.rate} refreshKey={confirmedCount} />
        <MyListings id="selling" onCount={onCount.selling} />
        <MyCommentedListings id="commented" onCount={onCount.commented} />{/* 기능 4 */}
      </div>
    </>
  )
}
