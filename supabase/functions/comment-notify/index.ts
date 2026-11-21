// 기능 4 · 댓글 알림 메일 (Supabase Edge Function: comment-notify)
//
// comments 표에 새 줄이 들어오면 Database Webhook 이 이 함수를 부르고,
// 이 함수가 "상대방"에게 Resend 로 알림 메일을 보낸다.
//   · 새 댓글                    → 판매자에게
//   · 판매자가 쓴 답글            → 원 댓글 쓴 사람에게
//   · 원 댓글 쓴 사람이 쓴 답글   → 판매자에게
// 메일에는 댓글 내용을 넣지 않는다. (글 제목 + 링크만)
//
// 설정 방법: docs/comments-setup.md
// 필요한 비밀 값(Edge Function Secrets): RESEND_API_KEY, NOTIFY_FROM, COMMENT_WEBHOOK_SECRET, APP_URL(선택)
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동으로 넣어 준다.

import { createClient } from 'npm:@supabase/supabase-js@2'

interface CommentRow {
  id: string
  listing_id: string
  author_id: string
  parent_id: string | null
}

interface ListingRow {
  id: string
  title: string
  seller_id: string
}

/** 메일 받을 사람과 그 사람의 역할(판매자 / 댓글 쓴 사람) */
export type Recipient = { userId: string; role: 'seller' | 'commenter' } | null

/** 누구에게 보낼지 정한다. DB 를 읽지 않는 함수라 따로 검사하기 쉽다. */
export function pickRecipient(comment: CommentRow, listing: ListingRow, parentAuthorId: string | null): Recipient {
  if (!comment.parent_id) {
    // 새 댓글 → 판매자에게. (판매자가 자기 글에 쓴 댓글이면 보낼 사람이 없다)
    return comment.author_id === listing.seller_id ? null : { userId: listing.seller_id, role: 'seller' }
  }
  if (!parentAuthorId) return null
  if (comment.author_id === listing.seller_id) {
    // 판매자의 답글 → 원 댓글 쓴 사람에게
    return parentAuthorId === listing.seller_id ? null : { userId: parentAuthorId, role: 'commenter' }
  }
  if (comment.author_id === parentAuthorId) {
    // 원 댓글 쓴 사람의 답글 → 판매자에게
    return { userId: listing.seller_id, role: 'seller' }
  }
  return null // DB 규칙(RLS)상 생기지 않는 경우
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string
  ))
}

/** 메일 제목·본문을 만든다. 댓글 내용은 넣지 않는다. */
export function buildEmail(title: string, link: string, role: 'seller' | 'commenter') {
  const sentence = (name: string) => role === 'seller'
    ? `회원님의 글 '${name}'에 새 댓글이 달렸습니다.`
    : `회원님이 댓글을 단 글 '${name}'에 새 답글이 달렸습니다.`
  return {
    subject: role === 'seller' ? '[BU 한인 중고거래] 새 댓글이 달렸어요' : '[BU 한인 중고거래] 새 답글이 달렸어요',
    text: `${sentence(title)}\n\n글 보러 가기: ${link}\n\n댓글 내용은 앱에서 확인할 수 있어요.`,
    html: [
      `<p>${escapeHtml(sentence(title))}</p>`,
      `<p><a href="${escapeHtml(link)}">글 보러 가기</a></p>`,
      '<p style="color:#888;font-size:12px">댓글 내용은 앱에서 확인할 수 있어요. 이 메일은 발신 전용이에요.</p>',
    ].join(''),
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // 웹훅에 넣어 둔 비밀 값이 맞아야만 메일을 보낸다. (아무나 이 주소를 불러 메일을 보내지 못하게)
  const webhookSecret = Deno.env.get('COMMENT_WEBHOOK_SECRET')
  if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: { type?: string; table?: string; record?: { id?: unknown } }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const commentId = payload.record?.id
  if (payload.type !== 'INSERT' || payload.table !== 'comments' || typeof commentId !== 'string') {
    return json({ skipped: 'not a new comment' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFY_FROM')
  if (!supabaseUrl || !serviceKey || !resendKey || !from) {
    console.error('comment-notify: 비밀 값이 빠졌어요. docs/comments-setup.md 를 확인하세요.')
    return json({ error: 'missing secrets' }, 500)
  }
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    // 웹훅 내용을 그대로 믿지 않고 DB 에서 다시 읽는다.
    const { data: comment, error: commentError } = await db.from('comments')
      .select('id, listing_id, author_id, parent_id').eq('id', commentId).maybeSingle()
    if (commentError) throw commentError
    if (!comment) return json({ skipped: 'comment not found' })

    const { data: listing, error: listingError } = await db.from('listings')
      .select('id, title, seller_id').eq('id', comment.listing_id).maybeSingle()
    if (listingError) throw listingError
    if (!listing) return json({ skipped: 'listing not found' })

    let parentAuthorId: string | null = null
    if (comment.parent_id) {
      const { data: parent, error: parentError } = await db.from('comments')
        .select('author_id').eq('id', comment.parent_id).maybeSingle()
      if (parentError) throw parentError
      parentAuthorId = parent?.author_id ?? null
    }

    const recipient = pickRecipient(comment as CommentRow, listing as ListingRow, parentAuthorId)
    if (!recipient) return json({ skipped: 'no recipient' })

    const { data: profile, error: profileError } = await db.from('profiles')
      .select('email').eq('id', recipient.userId).maybeSingle()
    if (profileError) throw profileError
    if (!profile?.email) return json({ skipped: 'no email' })

    const appUrl = (Deno.env.get('APP_URL') || 'https://bu-korean-marketplace.vercel.app').replace(/\/+$/, '')
    const mail = buildEmail(listing.title, `${appUrl}/listings/${listing.id}`, recipient.role)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [profile.email], subject: mail.subject, text: mail.text, html: mail.html }),
    })
    if (!response.ok) {
      console.error('comment-notify: Resend 발송 실패', response.status, await response.text())
      return json({ error: 'send failed' }, 502)
    }
    return json({ sent: true, role: recipient.role })
  } catch (error) {
    console.error('comment-notify: DB 읽기 실패', error)
    return json({ error: 'db error' }, 500)
  }
})
