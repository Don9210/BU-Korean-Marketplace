import { useEffect, useRef, useState, type UIEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import DealSection from '../components/DealSection'
import RatingSummary from '../components/RatingSummary'
import SecretComments from '../components/SecretComments'
import { useAuth } from '../lib/auth-context'
import { STATUS_LABELS, formatKrw, formatPrice, type ListingStatus } from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { Listing, Profile } from '../lib/types'

// 화면 6 · 상세(+비밀댓글) — 기능 4
// 거래 상태 버튼은 기능 5 의 DealSection, 평점 한 줄은 기능 6 의 RatingSummary 를 가져다 쓴다.

type Seller = Pick<Profile, 'id' | 'nickname' | 'rating_avg' | 'rating_count' | 'completed_count'>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_BADGE: Record<ListingStatus, string> = {
  available: 'bg-red-50 text-brand',
  reserved: 'bg-green-50 text-green-700',
  completed: 'bg-gray-200 text-gray-600',
}

/** 글과 판매자 정보를 불러온다. 글이 없거나 주소가 글 id 모양이 아니면 null. */
async function loadDetail(id: string): Promise<{ listing: Listing; seller: Seller | null } | null> {
  if (!UUID_PATTERN.test(id)) return null
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const listing = data as Listing
  const { data: sellerRow, error: sellerError } = await supabase.from('profiles')
    .select('id, nickname, rating_avg, rating_count, completed_count')
    .eq('id', listing.seller_id).maybeSingle()
  if (sellerError) throw sellerError
  return { listing, seller: sellerRow as Seller | null }
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const { session } = useAuth()
  if (!id || !session) return null
  // 다른 글로 이동하면 이전 글의 정보가 남지 않도록 처음부터 다시 그린다.
  return <ListingDetail key={id} id={id} userId={session.user.id} />
}

function ListingDetail({ id, userId }: { id: string; userId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [listing, setListing] = useState<Listing | null>(null)
  // DealSection 이 돌려주는 새 글 정보에는 판매자 정보가 없어서, 판매자는 따로 보관한다.
  const [seller, setSeller] = useState<Seller | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    void loadDetail(id).then((result) => {
      if (!active) return
      if (!result) {
        setState('missing')
        return
      }
      setListing(result.listing)
      setSeller(result.seller)
      setState('ready')
    }).catch(() => {
      if (active) setState('error')
    })
    return () => { active = false }
  }, [id, retry])

  /** 앱 안에서 들어왔으면 뒤로 가기(목록의 검색 조건 유지), 주소로 바로 들어왔으면 홈으로 */
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/')
  }

  if (state === 'loading') {
    return <p role="status" className="p-4 text-sm text-gray-600">글을 불러오고 있어요…</p>
  }
  if (state === 'error') {
    return (
      <section className="space-y-4 p-4">
        <p role="alert" className="text-sm text-red-700">글을 불러오지 못했어요. 다시 시도해 주세요.</p>
        <Button onClick={() => { setState('loading'); setRetry((count) => count + 1) }}>다시 시도</Button>
        <Link to="/" className="block py-3 text-sm text-gray-600 underline">목록으로</Link>
      </section>
    )
  }
  if (state === 'missing' || !listing) {
    return (
      <section className="space-y-2 p-4">
        <p className="text-base font-semibold">글이 없거나 삭제됐어요.</p>
        <Link to="/" className="inline-block py-3 text-sm font-semibold text-brand underline">목록으로</Link>
      </section>
    )
  }

  const isSeller = userId === listing.seller_id
  const completed = listing.status === 'completed'

  return (
    <article>
      <div className="px-4 py-1 md:px-6 md:py-2">
        <button type="button" onClick={goBack} className="min-h-10 pr-2 text-sm text-gray-600">← 목록</button>
      </div>

      {/* 넓은 화면에서는 왼쪽에 사진, 오른쪽에 정보·댓글을 나란히 둔다 */}
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6 md:px-6">
        <div className="md:sticky md:top-20 md:overflow-hidden md:rounded-xl">
          <PhotoSlider urls={listing.image_urls} title={listing.title} grayscale={completed} />
        </div>

        <div className="min-w-0">
          <section className="p-4 md:pt-0">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[listing.status]}`}>
                {STATUS_LABELS[listing.status]}
              </span>
              <span className="text-xs text-gray-500">
                {listing.category} · {new Date(listing.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 등록
              </span>
            </div>
            <h1 className="mt-2 break-words font-sans text-2xl font-bold tracking-tight text-gray-900">{listing.title}</h1>
            <p className="mt-1 text-xl font-extrabold text-gray-900">{formatPrice(listing.price)}</p>
            {/* DB 에 원화 칸이 아직 없을 때(값 없음)도 안전하게 넘어간다 */}
            {Boolean(listing.price_krw) && listing.price_krw !== null && (
              <p className="mt-1 text-sm text-gray-700">원화로도 받아요 · <span className="font-semibold">{formatKrw(listing.price_krw)}</span></p>
            )}
            <p className="mt-2 text-sm text-gray-700">📍 거래 장소: {listing.place}</p>
            {listing.description ? (
              <p className="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-gray-800">{listing.description}</p>
            ) : (
              <p className="mt-4 text-sm text-gray-400">설명이 없어요.</p>
            )}
            {isSeller && (
              <Link
                to={`/listings/${listing.id}/edit`}
                className="mt-4 block rounded-lg border border-gray-300 px-4 py-3 text-center text-base font-semibold text-gray-800 active:bg-gray-100"
              >
                글 수정·삭제
              </Link>
            )}
          </section>

          <SellerCard seller={seller} isMe={isSeller} />

          {/* 기능 5: 판매자에게는 상태 버튼, 선택된 구매자에게는 거래 확인 버튼. 그 밖의 사람에게는 안 보인다. */}
          <DealSection listing={listing} onChanged={setListing} />

          <SecretComments listing={listing} userId={userId} />
        </div>
      </div>
    </article>
  )
}

/** 사진 1~5장. 폰에서는 옆으로 밀어서, 넓은 화면에서는 ‹ › 버튼으로 넘긴다. */
function PhotoSlider({ urls, title, grayscale }: { urls: string[]; title: string; grayscale: boolean }) {
  const [index, setIndex] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const current = Math.min(index, urls.length - 1)

  /** 버튼으로 앞/뒤 사진으로 넘긴다 (마우스로는 옆으로 밀기 어렵기 때문) */
  function go(step: number) {
    const target = Math.max(0, Math.min(urls.length - 1, current + step))
    box.current?.scrollTo({ left: target * box.current.clientWidth, behavior: 'smooth' })
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const box = event.currentTarget
    setIndex(Math.round(box.scrollLeft / Math.max(1, box.clientWidth)))
  }

  return (
    <div className="relative bg-gray-100">
      <div ref={box} onScroll={handleScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {urls.map((url, i) => (
          <img
            key={`${i}-${url}`}
            src={url}
            alt={`${title} 사진 ${i + 1}`}
            className={`aspect-square w-full shrink-0 snap-center object-cover ${grayscale ? 'grayscale' : ''}`}
          />
        ))}
      </div>
      {urls.length > 1 && (
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {current + 1} / {urls.length}
        </span>
      )}
      {urls.length > 1 && (['prev', 'next'] as const).map((side) => (
        <button
          key={side}
          type="button"
          aria-label={side === 'prev' ? '이전 사진' : '다음 사진'}
          onClick={() => go(side === 'prev' ? -1 : 1)}
          disabled={side === 'prev' ? current === 0 : current === urls.length - 1}
          className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-gray-800 shadow disabled:opacity-30 md:flex ${
            side === 'prev' ? 'left-3' : 'right-3'
          }`}
        >
          {side === 'prev' ? '‹' : '›'}
        </button>
      ))}
    </div>
  )
}

/** 판매자 정보: 닉네임 · BU 인증 뱃지 · 평점 · 거래 완료 횟수 */
function SellerCard({ seller, isMe }: { seller: Seller | null; isMe: boolean }) {
  return (
    <section aria-label="판매자 정보" className="border-t border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500">판매자</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-base font-bold text-gray-900">
          {seller?.nickname || '알 수 없음'}{isMe && ' (나)'}
        </p>
        {/* 가입은 bu.edu 인증을 거친 사람만 할 수 있어서 모든 판매자가 인증된 학생이다. */}
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">✔ BU 인증</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingSummary ratingAvg={seller?.rating_avg ?? null} ratingCount={seller?.rating_count ?? 0} />
        <span className="text-sm text-gray-800">거래 완료 {seller?.completed_count ?? 0}회</span>
      </div>
    </section>
  )
}
