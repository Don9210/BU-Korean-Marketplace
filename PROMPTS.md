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
