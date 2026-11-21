# 시연용 체험 계정

도메인 연결 전에는 로그인 코드 메일이 팀원에게만 갑니다. 그동안 어드바이저나 다른 사람이 앱을 써 볼 수 있도록,
로그인 화면에 **체험 계정 버튼 3개**를 둘 수 있습니다. 누르면 메일 인증 없이 그 계정으로 들어갑니다.

- 코드: `src/components/DemoLogin.tsx` (로그인 화면 `LoginPage.tsx` 아래에 붙어 있음)
- 켜고 끄기: 환경 변수 `VITE_DEMO_PASSWORD`. 값이 없으면 버튼이 아예 보이지 않습니다.
- 기존 BU 이메일 코드 로그인은 그대로입니다.

## 켜는 방법 (Supabase·Vercel 권한이 있는 사람)

1. **계정 3개 만들기**: Supabase → Authentication → Users → Add user → Create new user
   - Email: `bumarket-demo-1@bu.edu`, `bumarket-demo-2@bu.edu`, `bumarket-demo-3@bu.edu` (철자 그대로)
   - Password: 세 계정 모두 **같은 비밀번호**. 새로 지어낸 값으로, 다른 곳에서 쓰는 비밀번호는 쓰지 않습니다.
   - **Auto Confirm User** 를 켭니다. (켜야 메일 없이 로그인됩니다)
2. **내 컴퓨터**: `.env` 에 `VITE_DEMO_PASSWORD=정한비밀번호` 한 줄을 추가하고 `npm run dev` 를 다시 시작합니다.
3. **배포 사이트**: Vercel → 프로젝트 → Settings → Environment Variables 에 `VITE_DEMO_PASSWORD` 를 추가한 뒤,
   Deployments 에서 최신 배포를 **Redeploy** 합니다. (환경 변수는 새로 배포해야 적용됩니다)
4. **닉네임 정하기**: 체험 계정 1·2·3으로 한 번씩 들어가 닉네임을 정해 둡니다. (예: 체험판매자, 체험구매자A, 체험구매자B)

## 알아 둘 것

- 비밀번호는 GitHub 에는 올라가지 않지만 **배포된 사이트의 코드에는 들어갑니다.** 사이트 주소를 아는 사람은 누구나
  체험 계정으로 들어와 글·댓글을 쓸 수 있습니다. 시연 기간에만 씁니다.
- 체험 계정에는 "BU 인증 학생만"이 적용되지 않습니다.
- 댓글 알림 메일은 체험 계정으로는 보내지 않습니다. (`comment-notify` 함수가 `bumarket-demo-` 주소를 건너뜀)

## 끄는 방법 (실제 공개 전에 반드시)

1. Vercel 의 `VITE_DEMO_PASSWORD` 를 지우고 Redeploy → 버튼이 사라집니다.
2. Supabase → Authentication → Users 에서 체험 계정 3개를 삭제합니다. (그 계정의 글·댓글도 함께 지워집니다)
3. 팀원 각자의 `.env` 에서도 그 줄을 지웁니다.
