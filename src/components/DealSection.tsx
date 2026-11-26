import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { STATUS_LABELS } from '../lib/constants'
import {
  completeDeal, confirmDeal, loadBuyerCandidates, loadPeople, setListingStatus, type Person,
} from '../lib/deals'
import type { Listing } from '../lib/types'
import Button from './Button'

interface Props {
  listing: Listing
  /** 상태가 바뀌면 새 글 정보를 돌려준다. 부모 화면이 이것으로 화면을 갱신한다. */
  onChanged: (listing: Listing) => void
}

/**
 * 기능 5 · 거래 상태 & 완료 확인 조각. 상세 화면에 끼워 쓴다.
 *   <DealSection listing={listing} onChanged={setListing} />
 * - 판매자에게: 판매중/예약중/거래완료 버튼, 거래완료 시 구매자 고르기
 * - 선택된 구매자에게: "거래 확인" 버튼
 * - 그 밖의 사람에게는 아무것도 보여 주지 않는다.
 */
export default function DealSection({ listing, onChanged }: Props) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // 구매자 고르기 창. null = 닫힘, 배열 = 열림(후보 목록)
  const [candidates, setCandidates] = useState<Person[] | null>(null)
  const [pickedId, setPickedId] = useState('')
  const [buyer, setBuyer] = useState<Person | null>(null)

  const isSeller = userId === listing.seller_id
  const isBuyer = Boolean(userId) && userId === listing.buyer_id
  const confirmed = Boolean(listing.buyer_confirmed_at)
  const buyerId = listing.buyer_id

  // 판매자에게 "누구의 확인을 기다리는지" 보여 주려고 구매자 닉네임을 가져온다.
  useEffect(() => {
    if (!isSeller || !buyerId) return
    let active = true
    void loadPeople([buyerId]).then((people) => {
      if (active) setBuyer(people.get(buyerId) ?? null)
    }).catch(() => { /* 닉네임을 못 가져와도 버튼은 쓸 수 있다 */ })
    return () => { active = false }
  }, [isSeller, buyerId])

  if (!userId || (!isSeller && !isBuyer)) return null

  /** 버튼 동작 공통 처리: 중복 클릭 막기 + 오류 문구 보여 주기 */
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = (status: 'available' | 'reserved') => run(async () => {
    onChanged(await setListingStatus(listing, userId, status))
    setCandidates(null)
  })

  const openPicker = () => run(async () => {
    const people = await loadBuyerCandidates(listing)
    setCandidates(people)
    setPickedId(listing.buyer_id ?? people[0]?.id ?? '')
  })

  const complete = () => run(async () => {
    if (!pickedId) throw new Error('구매자를 선택해 주세요.')
    onChanged(await completeDeal(listing, userId, pickedId))
    setCandidates(null)
  })

  const confirm = () => run(async () => {
    onChanged(await confirmDeal(listing.id, userId))
  })

  // ---------- 구매자 화면 ----------
  if (isBuyer) {
    return (
      <section className="border-t border-gray-200 p-4">
        <h2 className="text-lg text-gray-900">거래 확인</h2>
        {confirmed ? (
          <p className="mt-2 text-sm text-gray-700">거래가 확정됐어요. 내 활동에서 상대를 평가할 수 있어요.</p>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-gray-700">
              판매자가 회원님을 구매자로 선택했어요. 물건을 받았다면 거래를 확인해 주세요.
            </p>
            <Button onClick={confirm} disabled={busy}>{busy ? '확인하는 중…' : '거래 확인'}</Button>
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </section>
    )
  }

  // ---------- 판매자 화면 ----------
  return (
    <section className="border-t border-gray-200 p-4">
      <h2 className="text-lg text-gray-900">거래 상태</h2>

      {confirmed ? (
        <p className="mt-2 text-sm text-gray-700">
          구매자가 확인해서 거래가 확정됐어요. 확정된 거래는 상태를 바꿀 수 없어요.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="거래 상태 바꾸기">
            <Button
              variant={listing.status === 'available' ? 'primary' : 'secondary'}
              aria-pressed={listing.status === 'available'}
              disabled={busy || listing.status === 'available'}
              onClick={() => changeStatus('available')}
              className="px-2 text-sm"
            >
              {STATUS_LABELS.available}
            </Button>
            <Button
              variant={listing.status === 'reserved' ? 'primary' : 'secondary'}
              aria-pressed={listing.status === 'reserved'}
              disabled={busy || listing.status === 'reserved'}
              onClick={() => changeStatus('reserved')}
              className="px-2 text-sm"
            >
              {STATUS_LABELS.reserved}
            </Button>
            <Button
              variant={listing.status === 'completed' ? 'primary' : 'secondary'}
              aria-pressed={listing.status === 'completed'}
              disabled={busy}
              onClick={openPicker}
              className="px-2 text-sm"
            >
              {STATUS_LABELS.completed}
            </Button>
          </div>

          {listing.status === 'completed' && (
            <p className="mt-3 text-sm text-gray-700">
              {buyer?.nickname ? `${buyer.nickname} 님` : '구매자'}의 확인을 기다리고 있어요.
              확인 전까지는 상태나 구매자를 바꿀 수 있어요.
            </p>
          )}

          {candidates && (
            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-semibold">누구와 거래했나요?</p>
              {candidates.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                  아직 댓글을 단 사람이 없어요. 이 글에 댓글을 단 사람만 구매자로 선택할 수 있어요.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {candidates.map((person) => (
                    <li key={person.id}>
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="radio"
                          name="buyer"
                          value={person.id}
                          checked={pickedId === person.id}
                          onChange={() => setPickedId(person.id)}
                          className="h-5 w-5 accent-brand"
                        />
                        {person.nickname || '닉네임 없음'}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => setCandidates(null)}>닫기</Button>
                <Button disabled={busy || candidates.length === 0 || !pickedId} onClick={complete}>
                  {busy ? '저장 중…' : '거래완료'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}
