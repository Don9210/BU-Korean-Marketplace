import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { STATUS_LABELS, formatPrice } from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { Listing } from '../lib/types'
import Button from './Button'
import { IconTag } from './icons'

interface Props {
  /** 내 활동 "한눈에 보기"에서 이 구역으로 이동할 때 쓰는 id */
  id?: string
  /** 불러온 개수를 알려 준다. (내 활동 "한눈에 보기" 숫자) */
  onCount?: (count: number) => void
}

/** 기능 2: 본인 글을 다시 찾아 수정·삭제하기 위한 목록. */
export default function MyListings({ id, onCount }: Props) {
  const { session } = useAuth()
  const location = useLocation()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const userId = session?.user.id
  const notice = (location.state as { listingNotice?: string } | null)?.listingNotice

  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      try {
        const { data, error: requestError } = await supabase.from('listings').select('*')
          .eq('seller_id', userId).order('created_at', { ascending: false })
        if (requestError) throw requestError
        if (active) setListings(data as Listing[])
      } catch {
        if (active) setError('내 글을 불러오지 못했어요. 다시 시도해 주세요.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [userId, retry, location.key])

  useEffect(() => {
    if (!loading && !error) onCount?.(listings.length)
  }, [loading, error, listings.length, onCount])

  return (
    <section id={id} className="scroll-mt-20 border-b border-gray-100 p-4 md:px-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg text-gray-900"><IconTag className="h-5 w-5 text-brand" />내 판매 글</h2>
        <Link to="/listings/new" className="rounded-full bg-red-50 px-3 py-1.5 text-[13px] font-semibold text-brand active:bg-red-100">+ 물건 등록</Link>
      </div>
      {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
      {loading ? <p role="status" className="mt-4 text-sm text-gray-600">내 글을 불러오고 있어요…</p> : error ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button onClick={() => { setLoading(true); setError(''); setRetry((value) => value + 1) }}>다시 시도</Button>
        </div>
      ) : listings.length === 0 ? <p className="pt-2 text-sm text-gray-500">아직 등록한 물건이 없어요.</p> : (
        <ul className="mt-3 divide-y divide-gray-100">
          {listings.map((listing) => (
            <li key={listing.id} className="flex items-center gap-2">
              {/* 글을 누르면 상세 화면(댓글 · 거래 상태)으로, 오른쪽 "수정·삭제"는 수정 화면으로 간다 */}
              <Link
                to={`/listings/${listing.id}`}
                className={`flex min-w-0 flex-1 items-center gap-3 py-4 ${listing.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <img src={listing.image_urls[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{listing.title}</p>
                  <p className="mt-1 text-sm">
                    {formatPrice(listing.price)}
                    <span className="ml-2 text-xs text-gray-600">{STATUS_LABELS[listing.status]}</span>
                  </p>
                </div>
              </Link>
              <Link to={`/listings/${listing.id}/edit`} className="shrink-0 px-2 py-3 text-xs font-semibold text-brand">
                수정·삭제
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
