import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { formatPrice } from '../lib/constants'
import { confirmDeal, loadDealsToConfirm, loadPeople, type Person } from '../lib/deals'
import type { Listing } from '../lib/types'
import Button from './Button'
import { IconCheckCircle } from './icons'

interface Props {
  /** 거래를 확인하면 부른다. (내 프로필의 거래 횟수, 평가할 거래 목록을 새로 고치는 데 쓴다) */
  onConfirmed?: () => void
  /** 내 활동 "한눈에 보기"에서 이 구역으로 이동할 때 쓰는 id */
  id?: string
  /** 불러온 개수를 알려 준다. (내 활동 "한눈에 보기" 숫자) */
  onCount?: (count: number) => void
}

/** 기능 5 · 내 활동의 "확인 대기 거래": 판매자가 나를 구매자로 선택한 거래를 확인한다. */
export default function DealsToConfirm({ onConfirmed, id, onCount }: Props) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [deals, setDeals] = useState<Listing[]>([])
  const [sellers, setSellers] = useState<Map<string, Person>>(new Map())
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
        const list = await loadDealsToConfirm(userId)
        const people = await loadPeople(list.map((deal) => deal.seller_id))
        if (!active) return
        setDeals(list)
        setSellers(people)
      } catch {
        if (active) setLoadError('확인 대기 거래를 불러오지 못했어요. 다시 시도해 주세요.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [userId, retry])

  useEffect(() => {
    if (!loading && !loadError) onCount?.(deals.length)
  }, [loading, loadError, deals.length, onCount])

  async function handleConfirm(deal: Listing) {
    if (!userId || busyId) return
    setBusyId(deal.id)
    setError('')
    setNotice('')
    try {
      await confirmDeal(deal.id, userId)
      setDeals((current) => current.filter((item) => item.id !== deal.id))
      setNotice(`'${deal.title}' 거래를 확인했어요. 아래에서 상대를 평가할 수 있어요.`)
      onConfirmed?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '거래를 확인하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section id={id} className="scroll-mt-20 border-b border-gray-100 p-4 md:px-6">
      <h2 className="flex items-center gap-2 text-lg text-gray-900"><IconCheckCircle className="h-5 w-5 text-brand" />확인 대기 거래</h2>
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
        <p className="pt-2 text-sm text-gray-500">확인할 거래가 없어요.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {deals.map((deal) => (
            <li key={deal.id} className="py-4">
              <Link to={`/listings/${deal.id}`} className="flex items-center gap-3">
                <img src={deal.image_urls[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{deal.title}</p>
                  <p className="mt-1 text-sm">{formatPrice(deal.price)}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    판매자: {sellers.get(deal.seller_id)?.nickname || '알 수 없음'}
                  </p>
                </div>
              </Link>
              <p className="mt-3 text-sm text-gray-700">거래를 확인해 주세요. 물건을 받았다면 눌러 주세요.</p>
              <Button className="mt-2" disabled={Boolean(busyId)} onClick={() => handleConfirm(deal)}>
                {busyId === deal.id ? '확인하는 중…' : '거래 확인'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
