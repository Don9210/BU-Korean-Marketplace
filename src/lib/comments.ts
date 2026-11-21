import { loadPeople, type Person } from './deals'
import { supabase } from './supabase'
import type { Comment, Listing } from './types'

// 기능 4 · 비밀댓글에 필요한 DB 요청 모음.
// 누가 어떤 댓글을 볼 수 있는지는 DB 접근 규칙(RLS, supabase/schema.sql 5-3)이 정한다.
//   · 그 글의 판매자: 그 글의 모든 댓글
//   · 댓글 쓴 사람: 자기 댓글 + 그 아래 답글
//   · 그 밖의 사람: 아무것도 안 보임
// 그래서 화면은 "이 글의 댓글 전부 주세요"라고만 요청하면 된다.

export const COMMENT_MAX_LENGTH = 1000
const COMMENT_COLUMNS = 'id, listing_id, author_id, parent_id, body, created_at'

/** 대화 하나 = 원 댓글 1개 + 그 아래 답글들. 판매자와 원 댓글 쓴 사람의 1:1 대화다. */
export interface CommentThread {
  root: Comment
  replies: Comment[]
}

export interface CommentData {
  threads: CommentThread[]
  /** 댓글 쓴 사람들의 닉네임 */
  people: Map<string, Person>
}

/** 대화에서 마지막으로 글이 오간 시각 */
export function lastActivity(thread: CommentThread): number {
  const last = thread.replies.at(-1) ?? thread.root
  return Date.parse(last.created_at)
}

/** 이 글에서 내가 볼 수 있는 댓글을 불러와 대화(스레드)별로 묶는다. 최근에 대화가 오간 순서. */
export async function loadThreads(listingId: string): Promise<CommentData> {
  const { data, error } = await supabase.from('comments').select(COMMENT_COLUMNS)
    .eq('listing_id', listingId).order('created_at', { ascending: true })
  if (error) throw error
  const comments = data as Comment[]
  const people = await loadPeople(comments.map((comment) => comment.author_id))

  const repliesByRoot = new Map<string, Comment[]>()
  for (const comment of comments) {
    if (!comment.parent_id) continue
    const replies = repliesByRoot.get(comment.parent_id) ?? []
    replies.push(comment)
    repliesByRoot.set(comment.parent_id, replies)
  }
  const threads = comments
    .filter((comment) => !comment.parent_id)
    .map((root) => ({ root, replies: repliesByRoot.get(root.id) ?? [] }))
    .sort((a, b) => lastActivity(b) - lastActivity(a))
  return { threads, people }
}

/** 댓글(parentId 없음) 또는 답글(parentId = 원 댓글 id)을 남긴다. 저장되면 DB 가 알림 메일을 보낸다. */
export async function addComment(
  listingId: string, userId: string, body: string, parentId: string | null = null,
): Promise<Comment> {
  const text = body.trim()
  const length = Array.from(text).length
  if (length < 1) throw new Error('내용을 입력해 주세요.')
  if (length > COMMENT_MAX_LENGTH) throw new Error('댓글은 1,000자까지 쓸 수 있어요.')

  const { data, error } = await supabase.from('comments')
    .insert({ listing_id: listingId, author_id: userId, parent_id: parentId, body: text })
    .select(COMMENT_COLUMNS).single()
  if (error) {
    if (error.code === 'P0001') throw new Error(error.message) // DB 가 보낸 한글 안내 (예: 답글의 답글 금지)
    if (error.code === '42501') throw new Error('이 대화에는 판매자와 댓글을 쓴 사람만 답글을 달 수 있어요.')
    if (error.code === '23503') throw new Error('글이 삭제됐거나 댓글을 찾을 수 없어요. 새로고침해 주세요.')
    throw new Error('댓글을 보내지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
  }
  return data as Comment
}

/** 내 활동 · 내가 댓글 단 글. 내 글은 빼고, 최근에 댓글 단 순서로 돌려준다. */
export async function loadCommentedListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase.from('comments').select('listing_id, created_at')
    .eq('author_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  const ids = [...new Set((data as { listing_id: string }[]).map((row) => row.listing_id))]
  if (ids.length === 0) return []

  const { data: rows, error: listingError } = await supabase.from('listings').select('*')
    .in('id', ids).neq('seller_id', userId)
  if (listingError) throw listingError
  const order = new Map(ids.map((id, index) => [id, index]))
  return (rows as Listing[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
