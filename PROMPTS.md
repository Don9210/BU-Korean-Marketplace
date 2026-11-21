# PROMPTS.md — AI에게 보낸 주요 프롬프트 기록

> 최종 결과물 요건: 사용한 프롬프트 기록. 기능 하나를 만들거나 큰 수정을 할 때마다 아래 형식으로 추가한다.
> 작은 수정("버튼 색 바꿔줘")은 안 적어도 된다. 그날 작업을 대표하는 프롬프트 1~3개면 충분하다.

형식:

```
## YYYY-MM-DD · 작성자 · 기능

프롬프트:
(보낸 내용 그대로)

결과 / 메모:
(뭐가 만들어졌는지, 수정한 점, 막혔던 것)
```

---

## 2026-11-13 · 이동원 · 저장소 초기 세팅

프롬프트:
> github.com/Don9210/BU-Korean-Marketplace 복사해와. AGENTS.md 읽고, Vite + React + TypeScript + Tailwind 프로젝트를 만들고 Supabase 연결해줘. .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 넣을 자리 만들어줘. 다 되면 commit하고 push해줘.

결과 / 메모:
- 이 프롬프트는 그대로 보내지 않고, 아래 11-14 기록처럼 나눠서 진행함.

## 2026-11-14 · 이동원 · 화면 뼈대

프롬프트:
> (AGENTS.md 를 읽힌 뒤) 팀원 2명이 건드리기 전에 뼈대를 만들자. 화면 뼈대부터 만들어줘. schema.sql 도 만들자.

결과 / 메모:
- Vite + React + TypeScript + Tailwind 프로젝트 생성. `npm run dev` → `http://localhost:5173`
- 화면 7개를 "여기에 만들 것" 안내만 있는 빈 페이지로 만들고 `src/App.tsx` 에 주소 연결
- 공용: `components/`(AppLayout, AuthLayout, Button, PagePlaceholder, SetupBanner), `lib/`(supabase, constants, types)
- 추가한 패키지: `react-router-dom`(화면 이동), `@supabase/supabase-js`(Supabase 연결), `tailwindcss` + `@tailwindcss/vite`(스타일)
- `vercel.json`: Vercel 에서 `/me` 같은 주소로 바로 들어가도 열리게 하는 설정
- `.env` 가 비어 있어도 화면은 뜨고, 맨 위에 "Supabase 연결 전" 안내 띠가 보임
- 로그인 검사(비로그인 → /login)는 아직 없음. 기능 1(인증)에서 `App.tsx` 에 추가
- `supabase/schema.sql`: 테이블 4개, 접근 규칙(RLS), trigger, 사진 버킷(`listing-images`). 테스트용 DB 에서 규칙 58가지 확인. 실제 Supabase 에서는 아직 실행 전
- AGENTS.md 에 없던 것을 schema.sql 에 넣음: 글자 수 제한(닉네임 2~20, 제목 60, 설명 2000, 댓글 1000), 구매자가 확인한 거래는 삭제·상태 변경 불가, 사진 버킷은 공개

## 2026-11-15 · dugongjoon · 기능 1 이메일 인증

프롬프트:
> There're currently 6 MVPs, which one should I start first?
>
> log into my github account and work there

추가 확인:
> Not sure—include setup instructions

결과 / 메모:
- 기능 1을 먼저 진행하기로 안내한 뒤 GitHub 연결과 저장소 쓰기 권한 확인.
- BU 이메일 → 6자리 코드 → 닉네임 설정, 새로고침 후 로그인 유지, 로그아웃 구현.
- 인증/닉네임 유무에 따라 화면 이동, 코드 재발송 대기, 오류·닉네임 중복 안내 추가.
- 공유 파일 변경: `src/App.tsx`, `src/components/AppLayout.tsx`, `src/components/AuthGuard.tsx`, `src/components/SignOutButton.tsx`, `src/lib/supabase.ts`.
- 기존 DB의 BU 이메일 제한·프로필 접근 규칙 사용. `supabase/schema.sql`, `package.json`, npm 잠금 파일은 변경하지 않음.
- `docs/auth-setup.md`에 Supabase·Resend SMTP·OTP 템플릿 설정 및 실제 BU 계정 2개 테스트 절차 기록.
- 실제 Supabase 접속 정보가 없어 메일 발송·운영 DB 접근 규칙은 미검증. 다음 기능 전 실제 계정 테스트 필요.
- 검증: TypeScript·Vite 빌드, oxlint, 모의 Supabase API를 사용한 모바일 Chrome 브라우저 시나리오 10개 통과.

## 2026-11-15 · dugongjoon · 기능 1·2 범위 확정 및 물건 등록·수정·삭제

프롬프트:
> continue and again don't fix the exsiting code just execute the two scopes i mentioend

결과 / 메모:
- 범위를 BU 이메일 6자리 인증과 물건 등록·수정·삭제(사진 1~3장)로 한정.
- 기존 글 등록/수정 자리에서 폼 구현. 사진 미리보기·브라우저 JPEG 압축, 제목·달러 정수 가격·카테고리·거래 장소·설명 입력.
- `내 활동`에 본인 글 관리 컴포넌트만 연결. 소유자 검사, 삭제 확인, 저장 실패 처리, 미사용 사진 정리 추가.
- 기존 `supabase/schema.sql`은 그대로 사용. 사진 삭제에 필요한 본인 파일 SELECT 정책을 `supabase/listing-images-policy.sql`에 별도 추가.
- 추가 공유 파일: `src/components/MyListings.tsx`. `src/pages/MyActivityPage.tsx`에 이 컴포넌트 연결.
- 패키지, 기존 DB 스키마, 목록/검색, 상세/댓글, 거래 상태, 평점 기능은 변경하지 않음.
- 실제 Supabase 접속 정보가 없어 운영 데이터 쓰기·메일·RLS 검증은 하지 않음. 두 기능의 설정/실계정 테스트 방법을 docs에 기록.
- 검증: TypeScript·Vite 빌드, oxlint, 모의 API 기반 인증 10개·등록/수정/삭제 8개 브라우저 시나리오 통과. 빌드의 번들 크기 경고는 기능 범위 밖 최적화라 변경하지 않음.

## 2026-11-15 · 이동원 · 기능 5·6 거래 상태·완료 확인, 평점 (만들 수 있는 부분)

프롬프트:
> 내 부분은 5,6이야. 지금은 일단 5번 6번 만들수있는 부분들을 만들자.

결과 / 메모:
- 기능 5: 거래 상태 버튼·구매자 고르기 조각(`DealSection`), 내 활동의 "확인 대기 거래"(`DealsToConfirm`), DB 요청 함수(`src/lib/deals.ts`).
- 기능 6: 내 활동의 "평가할 거래"(`DealsToRate`, `RatingStars`), 평균 평점 표시(`RatingSummary`), DB 요청 함수(`src/lib/ratings.ts`).
- 내 활동 맨 위에 내 프로필(`MyProfileCard`: 닉네임·평점·거래 완료 횟수) 추가.
- 공유 파일 변경: `src/pages/MyActivityPage.tsx`(조각 연결), `src/components/`에 새 파일 6개. 기존 파일·패키지·DB는 건드리지 않음.
- `DealSection`은 상세 화면(기능 4)이 생기면 한 줄로 끼운다. 방법은 `docs/deals-ratings-setup.md`.
- 같은 날 `supabase/schema.sql`에 사진 읽기 규칙을 합침(`listing-images-policy.sql`과 같은 내용).
- 검증: 빌드, oxlint, 가짜 데이터(모의 API)로 폰 화면 동작 확인. 실제 Supabase 로그인 상태 테스트는 인증 메일 설정 후에 해야 함.

## 2026-11-21 · 이동원 · 다른 사람 이메일을 읽지 못하게 DB 권한 좁히기

- 요청: "(로그인한 사람이 API 로 다른 사람의 이메일을 읽을 수 있는 규칙) 이거는 고쳐야겠다."
- 결과: `schema.sql` 에서 `profiles` 읽기 권한을 이메일 칸만 빼고 주도록 변경. 화면은 `PROFILE_COLUMNS` 로 필요한 칸만 요청하고, 내 이메일은 로그인 정보에서 가져옴 (`types.ts`, `auth.tsx`, `MyProfileCard.tsx`).
- 확인: 빌드·린트 통과, 테스트용 DB 에서 10개 검사 통과. 실제 Supabase 에는 SQL 실행 필요.

## 2026-11-21 · 이동원 · PC(넓은 화면) 배치 추가

- 요청: "웹앱이여서, 포맷을 바꾸라고 하더라고. 웹에서 봤을때 적절하게. 지금은 폰화면 처럼 나와서." → "진행해"
- 결과: 화면 폭 768px 이상에서만 배치가 바뀜. 위 메뉴(`AppLayout`), 로그인 화면은 가운데 카드(`AuthLayout`), 목록은 3~4칸 격자(`ListPage`), 상세는 왼쪽 사진·오른쪽 정보 2단 + 사진 넘김 버튼(`ListingDetailPage`), 글쓰기는 가운데 폭 고정(`ListingFormPage`), 내 활동은 2칸(`MyActivityPage`). 폰 화면은 그대로.
- AGENTS.md 의 "폰 기준으로만" 규칙을 위 내용으로 변경.
- 확인: 빌드·린트, 가짜 데이터(모의 API)로 1280px 와 375px 화면 확인.

## 2026-11-21 · 이동원 · 시연용 체험 계정 버튼

- 요청: "지금은 실제로 배포할건아니여서 도메인을 안사도 돼게 할수가 있나? 첫화면을 조금 수정해서 모두 access할수있게" → "만들어줘"
- 결과: 로그인 화면 아래에 체험 계정 버튼 3개(`DemoLogin`). `VITE_DEMO_PASSWORD` 가 있을 때만 보임. 알림 메일 함수는 체험 계정 주소를 건너뜀. 설정·끄는 방법은 `docs/demo-accounts.md`.
- 확인: 빌드·린트, 가짜 서버로 버튼 표시·요청 내용·실패 안내 확인. 실제 계정으로 들어가는 것은 계정을 만든 뒤 확인해야 함.
