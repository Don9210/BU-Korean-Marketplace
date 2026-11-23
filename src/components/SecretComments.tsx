import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  COMMENT_MAX_LENGTH, addComment, lastActivity, loadThreads, type CommentThread,
} from '../lib/comments'
import type { Person } from '../lib/deals'
import type { Comment, Listing } from '../lib/types'
import Button from './Button'

interface Props {
  listing: Listing
  /** 지금 로그인한 사람 */
  userId: string
}

/** 새 댓글을 자동으로 확인하는 간격. 실시간 채팅이 아니라, 열어 둔 화면을 가끔 새로 고치는 정도다. */
const AUTO_REFRESH_MS = 10_000

/** 댓글 시각: "11월 20일 오후 2:03" */
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * 기능 4 · 비밀댓글. 상세 화면 아래에 붙는다.
 * - 판매자: 구매 희망자별 대화가 모두 보이고, 각 대화에 답글을 단다. (자기 글에 새 댓글은 쓰지 않는다)
 * - 그 밖의 사람: 내 대화만 보인다. 대화가 없으면 새 댓글을, 있으면 그 대화에 답글을 단다.
 * 볼 수 있는 댓글은 DB 접근 규칙(RLS)이 걸러서 보내 준다.
 * 화면을 열어 둔 동안 10초마다 새 댓글을 자동으로 확인한다. ("새 댓글 확인"을 누르면 바로 확인)
 */
export default function SecretComments({ listing, userId }: Props) {
  const isSeller = userId === listing.seller_id
  const [threads, setThreads] = useState<CommentThread[] | null>(null)
  const [people, setPeople] = useState<Map<string, Person>>(new Map())
  const [loadError, setLoadError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [reload, setReload] = useState(0)
  /** 내가 댓글을 보낼 때마다 1씩 늘린다. 보내기 전에 출발한 자동 확인 결과는 낡았으므로 버린다. */
  const sentCount = useRef(0)

  useEffect(() => {
    let active = true
    void loadThreads(listing.id).then((data) => {
      if (!active) return
      setThreads(data.threads)
      setPeople(data.people)
      setLoadError('')
    }).catch(() => {
      if (active) setLoadError('댓글을 불러오지 못했어요. 다시 시도해 주세요.')
    }).finally(() => {
      if (active) setRefreshing(false)
    })
    return () => { active = false }
  }, [listing.id, reload])

  // 상대방이 단 댓글이 새로고침 없이도 보이도록, 화면을 보고 있는 동안 10초마다 다시 가져온다.
  // 다른 탭을 보고 있을 때는 쉬고, 이 탭으로 돌아오면 바로 한 번 확인한다.
  useEffect(() => {
    let active = true
    let running = false
    async function check() {
      if (running || document.visibilityState !== 'visible') return
      running = true
      const sentBefore = sentCount.current
      try {
        const data = await loadThreads(listing.id)
        if (active && sentBefore === sentCount.current) {
          setThreads(data.threads)
          setPeople(data.people)
          setLoadError('')
        }
      } catch {
        // 자동 확인은 실패해도 조용히 넘어간다. 화면은 그대로 두고 다음 차례에 다시 시도한다.
      } finally {
        running = false
      }
    }
    const timer = window.setInterval(() => void check(), AUTO_REFRESH_MS)
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [listing.id])

  function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setReload((count) => count + 1)
  }

  /** 방금 보낸 댓글을 화면에 바로 붙인다. 답글이면 그 대화에, 새 댓글이면 새 대화로. */
  function handleSent(comment: Comment) {
    sentCount.current += 1
    setThreads((current) => {
      const list = current ?? []
      const next = comment.parent_id
        ? list.map((thread) => thread.root.id === comment.parent_id
          ? { ...thread, replies: [...thread.replies, comment] }
          : thread)
        : [{ root: comment, replies: [] }, ...list]
      return [...next].sort((a, b) => lastActivity(b) - lastActivity(a))
    })
  }

  const nameOf = (id: string) => people.get(id)?.nickname || '알 수 없음'

  return (
    <section aria-labelledby="comments-title" className="border-t border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h2 id="comments-title" className="text-base font-bold">비밀댓글</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing || threads === null}
          className="min-h-10 px-2 text-sm text-gray-600 underline disabled:opacity-50"
        >
          {refreshing ? '확인 중…' : '새 댓글 확인'}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        🔒 판매자와 댓글을 쓴 사람만 볼 수 있어요. 시간·장소 약속도 여기서 정해요.
      </p>

      {threads === null ? (
        loadError ? (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-sm text-red-700">{loadError}</p>
            <Button onClick={refresh} disabled={refreshing}>다시 시도</Button>
          </div>
        ) : (
          <p role="status" className="mt-4 text-sm text-gray-600">댓글을 불러오고 있어요…</p>
        )
      ) : (
        <>
          {loadError && <p role="alert" className="mt-3 text-sm text-red-700">{loadError}</p>}

          {threads.length === 0 && isSeller && (
            <p className="mt-4 text-sm text-gray-600">
              아직 댓글이 없어요. 구매 희망자가 댓글을 남기면 여기에 대화가 생겨요.
            </p>
          )}

          {threads.map((thread) => (
            <article key={thread.root.id} className="mt-4 rounded-xl border border-gray-200 p-3">
              {isSeller && (
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{nameOf(thread.root.author_id)} 님과의 대화</h3>
              )}
              <ol className="space-y-3">
                {[thread.root, ...thread.replies].map((comment) => {
                  const mine = comment.author_id === userId
                  const fromSeller = comment.author_id === listing.seller_id
                  return (
                    <li key={comment.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <p className="text-xs text-gray-500">
                        {mine ? '나' : `${nameOf(comment.author_id)}${fromSeller ? ' (판매자)' : ''}`} · {formatTime(comment.created_at)}
                      </p>
                      <p className={`mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        mine ? 'bg-brand text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {comment.body}
                      </p>
                    </li>
                  )
                })}
              </ol>
              <CommentForm
                listingId={listing.id}
                userId={userId}
                parentId={thread.root.id}
                label={isSeller ? `${nameOf(thread.root.author_id)} 님에게 답글` : '판매자에게 답글'}
                placeholder={isSeller ? `${nameOf(thread.root.author_id)} 님에게 답글 쓰기` : '판매자에게 답글 쓰기'}
                onSent={handleSent}
              />
            </article>
          ))}

          {/* 판매자가 아니고 아직 대화가 없을 때만 새 댓글을 쓴다. 대화가 있으면 그 안에서 이어 간다. */}
          {!isSeller && threads.length === 0 && (
            listing.status === 'completed' ? (
              <p className="mt-4 text-sm text-gray-600">거래가 끝난 글이라 새 댓글을 달 수 없어요.</p>
            ) : (
              <div className="mt-4">
                <CommentForm
                  listingId={listing.id}
                  userId={userId}
                  parentId={null}
                  label="판매자에게 댓글"
                  placeholder="댓글은 판매자와 나만 볼 수 있어요"
                  onSent={handleSent}
                />
              </div>
            )
          )}
        </>
      )}
    </section>
  )
}

interface FormProps {
  listingId: string
  userId: string
  /** null = 새 댓글, 값이 있으면 그 원 댓글에 다는 답글 */
  parentId: string | null
  /** 화면 낭독기용 이름 */
  label: string
  placeholder: string
  onSent: (comment: Comment) => void
}

/** 댓글·답글 입력칸 하나 */
function CommentForm({ listingId, userId, parentId, label, placeholder, onSent }: FormProps) {
  const inputId = useId()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const saved = await addComment(listingId, userId, text, parentId)
      setText('')
      onSent(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '댓글을 보내지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={parentId ? 'mt-3' : ''}>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className="flex items-end gap-2">
        <textarea
          id={inputId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder={placeholder}
          disabled={busy}
          className="min-w-0 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="min-h-11 shrink-0 rounded-lg bg-brand px-4 text-sm font-semibold text-white active:bg-brand-dark disabled:opacity-50"
        >
          {busy ? '보내는 중' : '보내기'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </form>
  )
}
