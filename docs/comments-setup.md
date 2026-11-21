# 기능 3·4 · 목록, 상세 페이지 + 비밀댓글, 댓글 알림 메일

DB 는 기존 `supabase/schema.sql` 을 그대로 씁니다. 새 테이블·새 SQL·새 패키지는 없습니다.

| 만든 것 | 파일 |
|---|---|
| 목록 & 검색/필터 (기능 3) | `src/pages/ListPage.tsx` |
| 상세 페이지 | `src/pages/ListingDetailPage.tsx` |
| 비밀댓글 | `src/components/SecretComments.tsx`, `src/lib/comments.ts` |
| 내 활동 · 내가 댓글 단 글 | `src/components/MyCommentedListings.tsx` (`MyActivityPage.tsx` 에 한 줄 연결) |
| 댓글 알림 메일 | `supabase/functions/comment-notify/index.ts` |

상세 페이지에는 기능 5 의 `DealSection`(거래 상태 버튼)과 기능 6 의 `RatingSummary`(평점)를 끼웠습니다.
공유 파일 변경: `src/pages/MyActivityPage.tsx`(import 1줄 + TODO 자리 1줄), `src/components/` 새 파일 2개.

## 비밀댓글 동작

- 누가 어떤 댓글을 볼 수 있는지는 DB 접근 규칙(RLS, `schema.sql` 5-3)이 정합니다. 화면은 "이 글의 댓글 전부"만 요청합니다.
- 판매자: 구매 희망자별 대화가 모두 보이고 각 대화에 답글을 답니다. 자기 글에는 새 댓글 칸이 없습니다.
- 그 밖의 사람: 내 대화만 보입니다. 대화가 없으면 새 댓글 칸("댓글은 판매자와 나만 볼 수 있어요"), 있으면 그 대화의 답글 칸.
- 답글은 항상 원 댓글에 답니다(1단계 답글). 거래완료 글에는 새 댓글을 달 수 없고, 기존 대화는 이어 갈 수 있습니다.
- 실시간 채팅이 아니므로 상대의 새 글은 "새 댓글 확인" 버튼이나 새로고침으로 봅니다. 알림 메일이 이를 알려 줍니다.

## 댓글 알림 메일 설정 (Supabase 대시보드 권한이 있는 사람)

흐름: `comments` INSERT → Database Webhook → Edge Function `comment-notify` → Resend.
받는 사람: 새 댓글 → 판매자 / 판매자의 답글 → 원 댓글 쓴 사람 / 원 댓글 쓴 사람의 답글 → 판매자.
메일에는 글 제목과 링크만 넣고 댓글 내용은 넣지 않습니다.
판매자에게는 "회원님의 글 '{제목}'에 새 댓글이 달렸습니다", 구매 희망자에게는 "회원님이 댓글을 단 글 '{제목}'에 새 답글이 달렸습니다"를 보냅니다.

1. **Resend**: 발신 도메인을 인증하고 API 키를 만듭니다.
   도메인 인증 전(`onboarding@resend.dev`)에는 Resend 계정 주인 주소로만 보내져서, 다른 BU 계정 테스트가 안 됩니다.
2. **함수 배포**: Edge Functions → Deploy a new function → Via Editor → 이름 `comment-notify` →
   `supabase/functions/comment-notify/index.ts` 내용을 붙여 넣고 Deploy.
   (CLI 를 쓰면 `supabase functions deploy comment-notify --no-verify-jwt`)
3. **JWT 검사 끄기**: Edge Functions → `comment-notify` → Settings → "Enforce JWT Verification" 끄기.
   대신 함수가 웹훅 비밀 값(`x-webhook-secret`)을 직접 검사하므로, 비밀 값이 없는 요청은 메일을 보내지 못합니다.
4. **비밀 값(Secrets)**: Edge Functions → Secrets 에 추가합니다. 프론트 `.env` 에는 넣지 않습니다.

   | 이름 | 값 |
   |---|---|
   | `RESEND_API_KEY` | Resend API 키 (`re_…`) |
   | `NOTIFY_FROM` | `BU 한인 중고거래 <noreply@인증한도메인>` |
   | `COMMENT_WEBHOOK_SECRET` | 길고 무작위인 문자열 (5번에서 같은 값 사용) |
   | `APP_URL` | (선택) `https://bu-korean-marketplace.vercel.app` |

   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 Supabase 가 자동으로 넣어 줍니다.
   만약 `SUPABASE_SERVICE_ROLE_KEY` 가 없다는 오류가 나면 secret 키를 `SERVICE_ROLE_KEY` 이름으로 추가합니다.
5. **웹훅**: Database → Webhooks → Create a new hook
   - Table: `public.comments`, Events: **Insert**
   - Type: Supabase Edge Functions → `comment-notify`, Method: POST
   - HTTP Headers: `x-webhook-secret` = 4번의 `COMMENT_WEBHOOK_SECRET` 값
6. **확인**: 댓글을 하나 단 뒤 Edge Functions → `comment-notify` → Logs 에서 결과를 봅니다.
   `{"sent":true}` 면 발송 성공, `unauthorized` 면 5번 헤더 값, `missing secrets` 면 4번, `send failed` 면 Resend 설정을 확인합니다.

## 실제 BU 계정 테스트 (A = 판매자, B·C = 구매 희망자)

로그인(기능 1)과 메일 설정이 끝난 뒤 진행합니다. A 는 일반 창, B·C 는 시크릿 창이나 다른 브라우저.

| 절차 | 기대 결과 |
|---|---|
| A 가 글 3개 등록 (카테고리·가격 다르게, 하나는 0원) | 홈에 최신순. 0원은 "무료 나눔" |
| 카테고리 / 제목 검색 / 가격 낮은 순 / 카드 → 뒤로 가기 | 조건대로 바뀌고, 뒤로 와도 조건 유지 |
| B 가 A 의 글 상세에서 댓글 | B 에게 내 대화가 생김. **A 에게 알림 메일** |
| A 가 상세에서 "B 님과의 대화"에 답글 | **B 에게 알림 메일** |
| B 가 같은 대화에 다시 답글 | **A 에게 알림 메일** |
| C 가 같은 글 상세를 봄 | B 의 대화가 보이지 않음. C 는 새 댓글 칸이 보임 |
| A 가 상세를 봄 | B·C 대화 모두 보임. 새 댓글 칸 없음 |
| A 가 거래완료 → 구매자 고르기 (기능 5) | B, C 가 후보로 나옴 |
| B 의 내 활동 | "내가 댓글 단 글"에 A 의 글. B 자신의 글은 나오지 않음 |
| 받은 메일 | 글 제목 + 링크만. 댓글 내용 없음 |

화면 확인과 별도로, B 의 실제 로그인 토큰으로 `comments` 를 직접 요청해 C 의 댓글이 오지 않는지도 확인합니다.
SQL Editor 의 관리자 권한은 RLS 를 우회하므로 이 테스트를 대신할 수 없습니다.

## 확인한 것과 못 한 것

- 확인: TypeScript·Vite 빌드, oxlint. 모의 API 로 목록 18개 시나리오, 상세·비밀댓글·내 활동 36개 시나리오
  (판매자·대화 중인 구매 희망자·처음 보는 사람 등 4명 시점, RLS 흉내). Edge Function 은 Deno 타입 검사와
  17개 시나리오(받는 사람 규칙, 비밀 값 검사, 실패 처리, 메일에 댓글 내용 없음, 제목 HTML 처리).
- 못 함: 실제 Supabase·Resend 연결. 로그인 메일 설정 후 위 표대로 테스트해야 합니다.

## 참고 (제안)

`profiles` 읽기 규칙이 로그인한 사람 모두에게 열려 있어서, API 로 다른 사람의 `email` 도 읽을 수 있습니다.
알림 메일은 서버(service role)가 이메일을 읽으므로, 나중에 `email` 열만 본인에게만 보이게 좁히는 것을 고려할 수 있습니다.
(이 작업에서는 규칙을 바꾸지 않았습니다.)
