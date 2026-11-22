import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { STATUS_LABELS, formatPrice } from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { Listing } from '../lib/types'
import Button from './Button'

/** 기능 2: 본인 글을 다시 찾아 수정·삭제하기 위한 목록. */
export default function MyListings() {
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

  return (
    <section className="border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">내 판매 글</h2>
        <Link to="/listings/new" className="py-3 text-sm font-semibold text-brand">물건 등록</Link>
      </div>
      {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
      {loading ? <p role="status" className="mt-4 text-sm text-gray-600">내 글을 불러오고 있어요…</p> : error ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button onClick={() => { setLoading(true); setError(''); setRetry((value) => value + 1) }}>다시 시도</Button>
        </div>
      ) : listings.length === 0 ? <p className="py-6 text-sm text-gray-600">아직 등록한 물건이 없어요.</p> : (
        <ul className="mt-3 divide-y divide-gray-100">
          {listings.map((listing) => (
            <li key={listing.id} className="flex items-center gap-2">
              {/* 글을 누르면 상세 화면(댓글 · 거래 상태)으로, 오른쪽 "수정·삭제"는 수정 화면으로 간다 */}
              <Link
                to={`/listings/${listing.id}`}
                className={`flex min-w-0 flex-1 items-center gap-3 py-4 ${listing.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <img src={listing.image_urls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
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
