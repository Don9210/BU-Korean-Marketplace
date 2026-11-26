import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { loadDealsToRate, submitRating, type DealToRate } from '../lib/ratings'
import Button from './Button'
import { IconStar } from './icons'
import RatingStars from './RatingStars'

interface Props {
  /** 값이 바뀌면 목록을 다시 불러온다. (방금 거래를 확인했을 때 부모가 올려 준다) */
  refreshKey?: number
  /** 내 활동 "한눈에 보기"에서 이 구역으로 이동할 때 쓰는 id */
  id?: string
  /** 불러온 개수를 알려 준다. (내 활동 "한눈에 보기" 숫자) */
  onCount?: (count: number) => void
}

/** 기능 6 · 내 활동의 "평가할 거래": 확정된 거래의 상대를 1~5점으로 평가한다. (선택, 거래당 1회) */
export default function DealsToRate({ refreshKey = 0, id: sectionId, onCount }: Props) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [deals, setDeals] = useState<DealToRate[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      try {
        const list = await loadDealsToRate(userId)
        if (active) {
          setDeals(list)
          setLoadError('')
        }
      } catch {
        if (active) setLoadError('평가할 거래를 불러오지 못했어요. 다시 시도해 주세요.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [userId, retry, refreshKey])

  useEffect(() => {
    if (!loading && !loadError) onCount?.(deals.length)
  }, [loading, loadError, deals.length, onCount])

  async function handleSubmit(deal: DealToRate) {
    if (!userId || busyId) return
    const id = deal.listing.id
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      await submitRating(deal, userId, scores[id] ?? 0)
      setDeals((current) => current.filter((item) => item.listing.id !== id))
      setNotice(`${deal.partner.nickname || '상대'} 님을 평가했어요.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '평가를 보내지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section id={sectionId} className="scroll-mt-20 border-b border-gray-100 p-4 md:px-6">
      <h2 className="flex items-center gap-2 text-lg text-gray-900"><IconStar className="h-5 w-5 text-brand" />평가할 거래</h2>
      {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="mt-4 text-sm text-gray-600">불러오고 있어요…</p>
      ) : loadError ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <Button onClick={() => { setLoading(true); setLoadError(''); setRetry((value) => value + 1) }}>
            다시 시도
          </Button>
        </div>
      ) : deals.length === 0 ? (
        <p className="pt-2 text-sm text-gray-500">평가할 거래가 없어요.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {deals.map((deal) => {
            const id = deal.listing.id
            const name = deal.partner.nickname || '알 수 없음'
            return (
              <li key={id} className="py-4">
                <div className="flex items-center gap-3">
                  <img src={deal.listing.image_urls[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{deal.listing.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{deal.partnerRole}: {name}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <RatingStars
                    label={`${name} 님 평가`}
                    value={scores[id] ?? 0}
                    disabled={Boolean(busyId)}
                    onChange={(score) => setScores((current) => ({ ...current, [id]: score }))}
                  />
                </div>
                <Button
                  className="mt-2"
                  disabled={Boolean(busyId) || !scores[id]}
                  onClick={() => handleSubmit(deal)}
                >
                  {busyId === id ? '보내는 중…' : '평가 보내기'}
                </Button>
                <p className="mt-2 text-xs text-gray-500">평가는 보낸 뒤에 고칠 수 없어요.</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
