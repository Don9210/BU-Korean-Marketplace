import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../lib/auth-context'
import { CATEGORIES, PLACES, MAX_IMAGES, PLACE_DETAIL_MAX, type Category, type Place } from '../lib/constants'
import { compressListingImage } from '../lib/listing-images'
import { deleteListing, loadOwnedListing, saveListing, validateListing, type ListingDraft, type ListingPhoto } from '../lib/listings'
import type { Listing } from '../lib/types'

const INPUT = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export default function ListingFormPage() {
  const { id } = useParams()
  const { session } = useAuth()
  if (!session) return null
  // 글 주소가 바뀌면 이전 글의 입력값과 사진을 남기지 않는다.
  return <ListingEditor key={`${session.user.id}:${id ?? 'new'}`} id={id} userId={session.user.id} />
}

function ListingEditor({ id, userId }: { id?: string; userId: string }) {
  const navigate = useNavigate()
  const [listingId] = useState(() => id ?? crypto.randomUUID())
  const [original, setOriginal] = useState<Listing | null>(null)
  const [draft, setDraft] = useState<ListingDraft>({ title: '', price: '', priceKrw: '', category: '', place: '', placeDetail: '', description: '' })
  const [photos, setPhotos] = useState<ListingPhoto[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [retry, setRetry] = useState(0)
  const previewUrls = useRef(new Set<string>())
  const mounted = useRef(true)
  const locked = Boolean(busy) || processing

  useEffect(() => {
    mounted.current = true
    const urls = previewUrls.current
    return () => { mounted.current = false; urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true
    void loadOwnedListing(id, userId).then((listing) => {
      if (!active) return
      if (!listing) { setLoadError('글이 없거나 수정 권한이 없어요.'); return }
      setOriginal(listing)
      setDraft({ title: listing.title, price: String(listing.price), priceKrw: listing.price_krw ? String(listing.price_krw) : '', category: listing.category, place: listing.place, placeDetail: listing.place_detail ?? '', description: listing.description })
      setPhotos(listing.image_urls.map((url) => ({ id: crypto.randomUUID(), previewUrl: url, existingUrl: url })))
    }).catch(() => {
      if (active) setLoadError('글을 불러오지 못했어요. 다시 시도해 주세요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, userId, retry])

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length || locked) return
    if (photos.length + files.length > MAX_IMAGES) { setError(`사진은 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`); return }
    setProcessing(true)
    setError('')
    const additions: ListingPhoto[] = []
    try {
      for (const file of files) {
        const compressed = await compressListingImage(file)
        if (!mounted.current) return
        const url = URL.createObjectURL(compressed)
        previewUrls.current.add(url)
        additions.push({ id: crypto.randomUUID(), previewUrl: url, file: compressed })
      }
      setPhotos((current) => [...current, ...additions])
    } catch (failure) {
      additions.forEach(({ previewUrl }) => { URL.revokeObjectURL(previewUrl); previewUrls.current.delete(previewUrl) })
      setError(failure instanceof Error ? failure.message : '사진을 준비하지 못했어요.')
    } finally {
      if (mounted.current) setProcessing(false)
    }
  }

  function removePhoto(photo: ListingPhoto) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
    if (photo.file) { URL.revokeObjectURL(photo.previewUrl); previewUrls.current.delete(photo.previewUrl) }
    setError('')
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked || (id && !original)) return
    const validationError = validateListing(draft, photos.length)
    if (validationError) { setError(validationError); return }
    setBusy('save')
    setError('')
    try {
      await saveListing({ id: listingId, userId, original, draft, photos })
      if (mounted.current) navigate('/me', { replace: true, state: { listingNotice: id ? '글을 수정했어요.' : '글을 등록했어요.' } })
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : '글을 저장하지 못했어요.')
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  async function handleDelete() {
    if (locked || !original || !window.confirm('이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없어요.')) return
    setBusy('delete')
    setError('')
    try {
      await deleteListing(original, userId)
      if (mounted.current) navigate('/me', { replace: true, state: { listingNotice: '글을 삭제했어요.' } })
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : '글을 삭제하지 못했어요.')
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  if (loading) return <p role="status" className="p-4 text-sm text-gray-600">글을 불러오고 있어요…</p>
  if (loadError) return (
    <section className="mx-auto max-w-xl space-y-4 p-4 md:py-8">
      <p role="alert">{loadError}</p>
      <Button onClick={() => { setLoading(true); setLoadError(''); setRetry((value) => value + 1) }}>다시 시도</Button>
      <Link to="/me" className="block py-3 text-brand underline">내 활동으로</Link>
    </section>
  )

  return (
    <section className="mx-auto max-w-xl p-4 md:py-8">
      <h1 className="text-xl font-bold">{id ? '글 수정' : '물건 등록'}</h1>
      <form onSubmit={handleSave} className="mt-6 space-y-5" noValidate>
        <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
          <div>
            <label htmlFor="listing-photos" className="block text-sm font-semibold">사진 ({photos.length}/{MAX_IMAGES})</label>
            <p id="photos-help" className="mt-1 text-xs text-gray-500">사진 1~{MAX_IMAGES}장을 추가해 주세요. 첫 사진이 대표 사진이에요.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
              {photos.map((photo, index) => (
                <div key={photo.id}>
                  <img src={photo.previewUrl} alt={`사진 ${index + 1}`} className="aspect-square w-full rounded-lg border border-gray-200 object-cover" />
                  <button type="button" onClick={() => removePhoto(photo)} aria-label={`사진 ${index + 1} 삭제`}
                    className="min-h-11 w-full text-sm text-red-700 underline">삭제</button>
                </div>
              ))}
            </div>
            <input id="listing-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
              disabled={locked || photos.length >= MAX_IMAGES} onChange={addPhotos} aria-describedby="photos-help"
              className="mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-4 file:py-3" />
            {processing && <p role="status" className="mt-2 text-sm text-gray-600">사진을 준비하고 있어요…</p>}
          </div>
          <label className="block text-sm font-semibold">제목
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required className={INPUT} placeholder="예: 상태 좋은 책상" />
          </label>
          <label className="block text-sm font-semibold">가격 ($)
            <input type="text" inputMode="numeric" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required className={INPUT} placeholder="0" aria-describedby="price-help" />
            <span id="price-help" className="mt-1 block text-xs font-normal text-gray-500">달러 정수로 입력해 주세요. 0은 무료 나눔이에요.</span>
          </label>
          <label className="block text-sm font-semibold">원화 가격 (₩) <span className="font-normal text-gray-500">· 선택</span>
            <input type="text" inputMode="numeric" value={draft.priceKrw} onChange={(event) => setDraft({ ...draft, priceKrw: event.target.value })} className={INPUT} placeholder="예: 30000" aria-describedby="krw-help" />
            <span id="krw-help" className="mt-1 block text-xs font-normal text-gray-500">원화로도 받을 수 있으면 금액을 적어 주세요. 비워 두면 달러로만 거래해요.</span>
          </label>
          <label className="block text-sm font-semibold">카테고리
            <select aria-label="카테고리" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })} required className={INPUT}>
              <option value="">선택해 주세요</option>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">거래 장소
            <select aria-label="거래 장소" value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value as Place })} required className={INPUT}>
              <option value="">선택해 주세요</option>{PLACES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          {/* '기타'를 골랐을 때만 직접 적는 칸이 나온다 */}
          {draft.place === '기타' && (
            <label className="block text-sm font-semibold">거래할 장소 직접 입력
              <input value={draft.placeDetail} onChange={(event) => setDraft({ ...draft, placeDetail: event.target.value })} required maxLength={PLACE_DETAIL_MAX} className={INPUT} placeholder="예: CAS 건물 앞" aria-describedby="place-detail-help" />
              <span id="place-detail-help" className="mt-1 block text-xs font-normal text-gray-500">집 주소나 방 번호 대신, 캠퍼스 안 사람이 많은 곳을 적어 주세요. ({PLACE_DETAIL_MAX}자 이내)</span>
            </label>
          )}
          <label className="block text-sm font-semibold">설명
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={5} className={INPUT} placeholder="물건의 상태와 거래할 때 알아야 할 내용을 적어 주세요." />
            <span className="mt-1 block text-xs font-normal text-gray-500">{Array.from(draft.description).length}/2,000자</span>
          </label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={locked}>{busy === 'save' ? '저장 중…' : id ? '수정 저장' : '등록하기'}</Button>
      </form>
      {original && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <Button variant="secondary" onClick={handleDelete} disabled={locked || Boolean(original.buyer_confirmed_at)} className="text-red-700">
            {busy === 'delete' ? '삭제 중…' : '글 삭제'}
          </Button>
          {original.buyer_confirmed_at && <p className="mt-2 text-xs text-gray-500">구매자가 확인한 거래는 삭제할 수 없어요.</p>}
        </div>
      )}
      {!locked && <Link to="/me" className="mt-4 inline-block py-3 text-sm text-gray-600 underline">내 활동으로</Link>}
    </section>
  )
}
