import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { loadCommentedListings } from '../lib/comments'
import { STATUS_LABELS, formatPrice } from '../lib/constants'
import type { Listing } from '../lib/types'
import Button from './Button'

/** 기능 4 · 내 활동의 "내가 댓글 단 글": 내가 비밀댓글을 남긴 글. 누르면 그 글의 대화로 간다. */
export default function MyCommentedListings() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!userId) return
    let active = true
    void loadCommentedListings(userId).then((rows) => {
      if (active) {
        setListings(rows)
        setError('')
      }
    }).catch(() => {
      if (active) setError('댓글 단 글을 불러오지 못했어요. 다시 시도해 주세요.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [userId, retry])

  return (
    <section className="border-b border-gray-200 p-4">
      <h2 className="text-xl font-bold">내가 댓글 단 글</h2>
      {loading ? <p role="status" className="mt-4 text-sm text-gray-600">불러오고 있어요…</p> : error ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button onClick={() => { setLoading(true); setError(''); setRetry((value) => value + 1) }}>다시 시도</Button>
        </div>
      ) : listings.length === 0 ? <p className="py-6 text-sm text-gray-600">아직 댓글 단 글이 없어요.</p> : (
        <ul className="mt-3 divide-y divide-gray-100">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                to={`/listings/${listing.id}`}
                className={`flex items-center gap-3 py-4 ${listing.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <img src={listing.image_urls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{listing.title}</p>
                  <p className="mt-1 text-sm">{formatPrice(listing.price)}</p>
                </div>
                <span className="text-xs text-gray-600">{STATUS_LABELS[listing.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
