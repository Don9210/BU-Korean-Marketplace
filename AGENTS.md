# AGENTS.md — AI 작업 지시문 (bu-market)

> 이 파일은 Claude Code, Codex 등 AI 코딩 도구가 가장 먼저 읽는 규칙이다.
> 아래 규칙은 팀이 이미 결정한 것이다. 더 좋은 방식이 보여도 **제안만 하고, 규칙과 다르게 구현하지 마라.**
> 팀원은 모두 코딩 초심자다. 설명은 짧고 쉽게, 용어는 한글(영어) 병기로.
> 전체 규칙은 팀 규칙서(BU_중고거래_팀_개발_규칙서 v3)에 있고, 충돌하면 규칙서가 우선이다.

## 프로젝트

- BU 한인 유학생용 캠퍼스 중고거래 **모바일 웹앱**. bu.edu 이메일 인증 사용자끼리만 거래.
- 핵심 흐름: **인증 → 등록 → 검색 → 비밀댓글로 연락 → 거래 완료 → 평점**. 이 흐름 외 기능은 만들지 않는다.
- 팀: BU LIKELION 6기 (신동준 · 이동원 · 이준성). 4주 MVP. 봄학기에 Capacitor로 앱스토어 전환 예정.

## 기술 스택 — 바꾸지 마라

- 프론트: **Vite + React + TypeScript + Tailwind CSS**. Next.js 사용 금지(봄학기 Capacitor 포장 때문).
- 백엔드: **Supabase** (Auth, Postgres, Storage, Edge Functions). 별도 서버 없음.
- 메일 발송: **Resend** (인증 코드 메일은 Supabase SMTP 설정으로, 댓글 알림 메일은 Supabase Edge Function에서 Resend API 호출).
- 배포: **Vercel** (GitHub main에 push하면 자동 배포). 코드 저장: GitHub.
- 화면은 **폰(모바일) 기준으로만** 만든다. PC 레이아웃에 시간 쓰지 않는다.
- 폴더: `src/` 아래에 `pages/`, `components/`, `lib/`(supabase 클라이언트), `supabase/`(schema.sql, functions/).

## 인증

- **이메일 OTP 6자리 코드 방식.** Supabase `signInWithOtp` → `verifyOtp`. 매직 링크(이메일 링크 로그인) 사용 금지. Clerk 등 외부 로그인 서비스 사용 금지.
- **@bu.edu 이메일만** 가입 가능. 검사는 두 군데: 화면(안내 문구용) + DB(`before-user-created` Auth Hook 또는 trigger, 보안용). 화면 검사만으로 끝내지 마라.
- 첫 로그인 후 **닉네임 입력 필수**. 비밀번호 화면은 없다.
- 로그인 상태는 브라우저에 유지한다.

## 만드는 기능 6개 (이것만)

1. **bu.edu 이메일 인증** — 이메일 입력 → 6자리 코드 → 닉네임 설정
2. **물건 등록·수정·삭제** — 사진 1~3장(업로드 전 브라우저 압축), 제목, 가격, 카테고리, 거래 장소, 설명. 내 글만 수정·삭제
3. **목록 & 검색/필터** — 최신순, 카테고리 필터, 키워드 검색(ilike), 가격 낮은 순 정렬. 거래완료 글은 회색 + 맨 아래
4. **상세 페이지 + 비밀댓글** — 판매자 닉네임·인증 뱃지·거래 완료 횟수·평점 표시. 댓글은 전부 비밀댓글(글쓴이와 그 댓글 작성자만 열람). 1단계 답글만(답글의 답글은 없음). 단, 한 댓글 아래에 글쓴이와 그 댓글 작성자가 답글을 여러 번 주고받을 수 있다 — 시간·장소 조율은 전부 이 댓글 안에서 한다(카톡 ID 등 외부 연락처를 요구하지 않는다). 댓글 입력란 안내 문구: "댓글은 판매자와 나만 볼 수 있어요". 새 댓글이 달리면 글쓴이에게, 답글이 달리면 **답글을 쓴 사람의 상대방**에게(글쓴이가 쓰면 원 댓글 작성자에게, 원 댓글 작성자가 쓰면 글쓴이에게) **이메일 알림**
5. **거래 상태 & 완료 확인** — 판매자가 판매중/예약중/거래완료 변경. 완료 시 댓글 단 사람 중 구매자 선택 → 구매자가 확인 → 양쪽 `completed_count` +1 (DB trigger)
6. **평점/리뷰** — 양쪽 확인이 끝난 거래에서 상대를 1~5점 평가(거래당 1회). 프로필에 평균 평점 표시. 평점이 없으면 "아직 평가 없음"

## 만들지 않는 기능 — 제안도 하지 마라

실시간 채팅, 공개 댓글, 푸시 알림, 학교 선택, 결제·에스크로, 배송, 지도, 학생증 스캔, 관리자 승인, 독촉 알림, PC 전용 레이아웃.

## 고정 값 (코드에 상수로)

- 카테고리: `가구 / 주방용품 / 교재 / 전자기기 / 의류 / 기타`
- 거래 장소: `GSU 앞 / Warren Towers 앞 / Mugar 도서관 앞 / 기타`
- 상태: `available`(판매중) / `reserved`(예약중) / `completed`(거래완료)
- 사진 최대 3장. 가격은 달러 정수, 0 = "무료 나눔".

## DB — 테이블 4개만. 더 필요하면 먼저 물어봐라

```
profiles  (id uuid PK → auth.users, email, nickname unique, rating_avg numeric null,
           rating_count int default 0, completed_count int default 0, created_at)
listings  (id uuid PK, seller_id → profiles, title, price int, category, place, description,
           image_urls text[], status default 'available', buyer_id → profiles null,
           seller_completed_at null, buyer_confirmed_at null, reported bool default false, created_at)
comments  (id uuid PK, listing_id → listings, author_id → profiles, parent_id → comments null,
           body, created_at)
ratings   (id uuid PK, listing_id → listings, rater_id → profiles, ratee_id → profiles,
           score int 1~5, created_at, unique(listing_id, rater_id))
```

RLS(접근 규칙)는 반드시 DB에 넣는다:
- 로그인 사용자만 `listings`, `profiles` 읽기. 비로그인은 아무것도 못 본다.
- `comments` 읽기는 그 글의 `seller_id` 본인, `author_id` 본인, 또는 답글인 경우 원 댓글(`parent_id`)의 작성자 본인만(구매자가 판매자의 답글을 볼 수 있어야 한다). 삽입은 본인 `author_id`로만. 답글 삽입은 그 글의 `seller_id` 또는 원 댓글 작성자만. 수정·삭제는 작성자만.
- `listings` 수정·삭제는 `seller_id` 본인만. `buyer_confirmed_at`만 `buyer_id` 본인이 쓸 수 있다.
- `ratings` 삽입은 `buyer_confirmed_at`이 있는 글에서, rater가 그 글의 seller 또는 buyer일 때만.
- `profiles` 수정은 본인만. `completed_count`, `rating_avg`, `rating_count`는 trigger가 갱신한다. 화면 코드에서 직접 올리지 마라.
- `auth.users` 생성 시 이메일이 `@bu.edu`로 끝나지 않으면 거부.
- SQL은 `supabase/schema.sql`에 보관한다.

## 거래 완료 규칙 (그대로 구현)

1. 구매자가 비밀댓글 → `comments` 기록 + 판매자에게 이메일 알림. 판매자 답글 → 구매자에게 알림. 구매자가 같은 댓글에 다시 답글 → 판매자에게 알림. 이렇게 댓글 안에서 거래 약속을 잡는다.
2. 판매자가 "거래완료" → 댓글 단 사람 목록에서 구매자 선택 → `buyer_id`, `seller_completed_at` 저장, `status = completed`.
3. 구매자 "내 활동"에 "거래를 확인해 주세요" → 누르면 `buyer_confirmed_at` 저장 → trigger가 양쪽 `completed_count` +1.
4. 구매자가 확인 안 하면 그대로 둔다. 독촉·알림 없음.
5. 양쪽 확인 후 각자 "내 활동"에서 상대를 1~5점 평가(선택, 거래당 1회).

## 댓글 알림 메일

- Supabase **Database Webhook**(comments INSERT) → **Edge Function** → Resend API로 발송.
- `RESEND_API_KEY`는 **Supabase Edge Function secret**에만 둔다. 프론트 `.env`나 코드에 절대 넣지 마라.
- 메일 내용: "회원님의 글 '{제목}'에 새 댓글이 달렸습니다" + 글 링크. 댓글 본문은 메일에 넣지 않는다.

## 화면 7개 (이것만)

1 로그인(이메일) · 2 코드 입력 · 3 프로필 설정(닉네임) · 4 목록(홈) · 5 글 등록/수정 · 6 상세(+비밀댓글) · 7 내 활동(내 글, 내가 댓글 단 글, 확인 대기 거래, 평가할 거래)

## 작업 방식

- **한 번에 한 가지 기능만.** 끝나면 실제 bu.edu 계정 2개로 테스트하는 방법을 알려줘라.
- 작업 시작 전 `git pull`. 끝나면 `commit` 메시지는 한글로 짧게(예: `상세 페이지 비밀댓글 추가`). push는 main에.
- 팀원 3명이 각자 다른 기능을 동시에 작업한다. 공유 파일(라우터 `App.tsx`, `package.json`, `supabase/schema.sql`, `components/`)을 고칠 땐 꼭 필요한 최소한만 바꾸고, 바꿨다고 사용자에게 알려줘라(단톡에 공유할 수 있게). 충돌(merge conflict)이 나면 양쪽 변경을 모두 살리는 방향으로 해결하고 결과를 설명해라.
- 비밀 값(키)은 `.env`에만. `.env`는 `.gitignore`에 있다. 코드·커밋에 넣지 마라. `.env.example`에는 변수 이름만.
- 내가 보낸 주요 프롬프트를 `PROMPTS.md`에 날짜·작성자와 함께 기록해라.
- 에러가 나면: 원인을 한 문장으로 쉽게 설명하고, 고치는 방법을 한 번에 하나씩.
- 패키지를 새로 추가할 때는 왜 필요한지 한 줄 설명하고 추가해라.
