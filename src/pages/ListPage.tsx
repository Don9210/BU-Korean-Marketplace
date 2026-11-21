import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import {
  CATEGORIES, STATUS_LABELS, formatPrice, type Category, type ListingStatus,
} from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { Listing } from '../lib/types'

// 화면 4 · 목록(홈) — 기능 3
// 검색어·카테고리·정렬은 주소창(예: /?q=책상&category=가구&sort=price)에 저장한다.
// 그래서 상세 화면에 갔다가 뒤로 와도 고른 조건이 그대로 남는다.

type SortOption = 'latest' | 'price'

const SORT_LABELS: Record<SortOption, string> = {
  latest: '최신순',
  price: '가격 낮은 순',
}

const STATUS_BADGE: Record<ListingStatus, string> = {
  available: 'bg-red-50 text-brand',
  reserved: 'bg-green-50 text-green-700',
  completed: 'bg-gray-200 text-gray-600',
}

const LOAD_ERROR = '물건 목록을 불러오지 못했어요. 다시 시도해 주세요.'

/** 검색어 속 %, _ 는 DB 검색(ilike)에서 "아무 글자"라는 특수 기호라서, 글자 그대로 찾도록 \ 를 붙인다. */
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** 조건에 맞는 글을 DB 에서 가져온다. 누가 볼 수 있는지는 DB 접근 규칙(RLS)이 검사한다. */
async function loadListings(category: Category | null, keyword: string, sort: SortOption) {
  let query = supabase.from('listings').select('*')
  if (category) query = query.eq('category', category)
  if (keyword) query = query.ilike('title', `%${escapeLike(keyword)}%`) // 제목에 검색어가 들어간 글
  query = sort === 'price'
    ? query.order('price', { ascending: true }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  const rows = data as Listing[]
  // DB 정렬로는 "거래완료만 맨 아래"를 할 수 없어서(상태가 알파벳 순서로 정렬됨) 여기서 나눈다.
  // 나눠도 각 묶음 안의 순서(최신순 / 가격순)는 그대로 유지된다.
  return [
    ...rows.filter((listing) => listing.status !== 'completed'),
    ...rows.filter((listing) => listing.status === 'completed'),
  ]
}

export default function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = (searchParams.get('q') ?? '').trim()
  const categoryParam = searchParams.get('category') ?? ''
  const category = (CATEGORIES as readonly string[]).includes(categoryParam) ? categoryParam as Category : null
  const sort: SortOption = searchParams.get('sort') === 'price' ? 'price' : 'latest'
  const [retry, setRetry] = useState(0)

  // 마지막으로 받은 결과. key 는 "어떤 조건으로 받은 결과인지"를 적어 둔 것이다.
  // 조건이 바뀌면 key 가 달라지므로 새 결과가 올 때까지 자동으로 "불러오는 중"이 된다.
  const requestKey = `${category ?? ''}|${q}|${sort}|${retry}`
  const [result, setResult] = useState<{ key: string; listings: Listing[]; error: string } | null>(null)
  const loading = result?.key !== requestKey
  const listings = result?.listings ?? []
  const error = loading ? '' : result?.error ?? ''

  useEffect(() => {
    let active = true // 화면을 떠났거나 조건이 바뀌었으면 늦게 온 결과는 버린다.
    void loadListings(category, q, sort)
      .then((rows) => { if (active) setResult({ key: requestKey, listings: rows, error: '' }) })
      .catch(() => { if (active) setResult({ key: requestKey, listings: [], error: LOAD_ERROR }) })
    return () => { active = false }
  }, [category, q, sort, requestKey])

  /** 주소창의 조건 하나를 바꾼다. 빈 값이면 지운다. (뒤로 가기 기록은 쌓지 않는다) */
  function updateParam(name: 'q' | 'category' | 'sort', value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    }, { replace: true })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    updateParam('q', keyword)
  }

  return (
    <section className="p-4">
      <h1 className="sr-only">물건 목록</h1>

      {/* 검색: 입력 후 검색 버튼(또는 키보드의 검색 키)을 누르면 적용 */}
      <form role="search" onSubmit={handleSearch} className="flex gap-2">
        <label htmlFor="listing-search" className="sr-only">물건 이름 검색</label>
        <input
          id="listing-search"
          key={q} // 검색어가 바뀌면(뒤로 가기 포함) 입력칸을 그 값으로 다시 채운다
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={q}
          maxLength={60}
          placeholder="물건 이름으로 검색"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button type="submit" className="shrink-0 rounded-lg bg-brand px-4 text-sm font-semibold text-white active:bg-brand-dark">
          검색
        </button>
      </form>

      {/* 카테고리 필터: 옆으로 밀어서 더 볼 수 있다 */}
      <div role="group" aria-label="카테고리" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[null, ...CATEGORIES].map((value) => {
          const selected = category === value
          return (
            <button
              key={value ?? '전체'}
              type="button"
              aria-pressed={selected}
              onClick={() => updateParam('category', value ?? '')}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                selected ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {value ?? '전체'}
            </button>
          )
        })}
      </div>

      {/* 결과 개수 + 정렬 */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-gray-600" aria-live="polite">
          {loading ? '불러오는 중…' : `물건 ${listings.length}개`}
        </p>
        <div role="group" aria-label="정렬" className="flex">
          {(['latest', 'price'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={sort === option}
              onClick={() => updateParam('sort', option === 'latest' ? '' : option)}
              className={`min-h-10 px-2 text-sm ${sort === option ? 'font-bold text-gray-900' : 'text-gray-500'}`}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <p className="mt-1 text-sm text-gray-700">
          ‘{q}’ 검색 결과{' '}
          <button type="button" onClick={() => updateParam('q', '')} className="min-h-10 px-1 text-brand underline">
            검색어 지우기
          </button>
        </p>
      )}

      {/* 목록 본문: 처음 불러오는 중 → 오류 → 결과 없음 → 카드 목록 순서로 확인 */}
      {!result ? (
        <p role="status" className="py-10 text-center text-sm text-gray-600">물건을 불러오고 있어요…</p>
      ) : error ? (
        <div className="mt-6 space-y-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button onClick={() => setRetry((count) => count + 1)}>다시 시도</Button>
        </div>
      ) : !loading && listings.length === 0 ? (
        q || category ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600">조건에 맞는 물건이 없어요.</p>
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              className="mt-2 min-h-11 px-2 text-sm font-semibold text-brand underline"
            >
              검색·필터 초기화
            </button>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600">아직 올라온 물건이 없어요.</p>
            <Link to="/listings/new" className="mt-2 inline-block py-3 text-sm font-semibold text-brand underline">
              첫 물건 등록하기
            </Link>
          </div>
        )
      ) : (
        <ul aria-busy={loading} className={`mt-2 divide-y divide-gray-100 ${loading ? 'opacity-50' : ''}`}>
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </ul>
      )}
    </section>
  )
}

/** 물건 카드 한 장: 대표 사진(첫 장) · 제목 · 카테고리 · 장소 · 상태 · 가격. 누르면 상세 화면. */
function ListingCard({ listing }: { listing: Listing }) {
  const done = listing.status === 'completed' // 거래완료 글은 회색으로 보여 준다

  return (
    <li>
      <Link to={`/listings/${listing.id}`} className={`flex gap-3 py-4 active:bg-gray-50 ${done ? 'opacity-60' : ''}`}>
        <img
          src={listing.image_urls[0]}
          alt=""
          loading="lazy"
          className={`h-24 w-24 shrink-0 rounded-lg border border-gray-100 bg-gray-100 object-cover ${done ? 'grayscale' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{listing.title}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{listing.category} · {listing.place}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[listing.status]}`}>
              {STATUS_LABELS[listing.status]}
            </span>
            <span className="truncate text-base font-bold text-gray-900">{formatPrice(listing.price)}</span>
          </div>
        </div>
      </Link>
    </li>
  )
}