# 기능 1 · BU 이메일 인증 설정과 테스트

구현 흐름: 이메일 입력 → 6자리 코드 확인 → 첫 로그인 시 닉네임 설정 → 홈.
다시 방문하면 로그인 상태를 복원하고, 닉네임이 없는 계정은 설정 화면으로 이동합니다.
로그아웃하면 같은 브라우저의 다른 탭에서도 보호된 화면을 볼 수 없습니다.

## 1. 팀 Supabase 프로젝트 연결

새 프로젝트를 만들기 전에 동원에게 기존 프로젝트 주소와 **anon 공개 키**를 받습니다.
`.env.example`을 `.env`로 복사하고 두 값을 채웁니다.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env`는 GitHub에 올리지 않습니다. `service_role` 키나 Resend API 키를 프론트 환경변수에 넣지 않습니다.
Vercel에도 같은 두 환경변수를 등록하고 다시 배포해야 적용됩니다.
로컬에서는 환경변수 변경 후 개발 서버를 다시 시작합니다.

## 2. 데이터베이스 규칙 확인

프로젝트 담당자가 Supabase SQL Editor에서 저장소의 `supabase/schema.sql` 적용 여부를 확인합니다.
아직 적용하지 않았다면 이 파일을 실행합니다. 이 작업은 실제 팀 DB에 테이블·권한·트리거를 설정합니다.
인증 기능에서는 기존 SQL을 변경하지 않았습니다.

확인할 항목:

- `auth.users`의 `require_bu_email` 트리거: `@bu.edu`가 아닌 계정 생성/이메일 변경 거부.
- `handle_new_user` 트리거: 가입 시 `profiles`에 사용자 생성.
- `profiles.nickname`: 중복 불가, 공백을 뺀 길이 2~20자.
- `profiles` 접근 규칙(RLS): 로그인한 사용자만 읽기, 본인 닉네임만 수정.
- `listings`, `profiles` 등 테이블에서 `anon`(비로그인)의 접근 차단.

규칙 적용 전에 만든 테스트 계정은 프로필이 없을 수 있습니다. 프로필 로딩 오류가 나면
담당자가 해당 계정의 `profiles` 행과 가입 트리거부터 확인합니다. 화면에서는 임의로 프로필을 생성하지 않습니다.

## 3. 이메일을 링크 대신 6자리 코드로 설정

Supabase Authentication에서 Email 로그인을 활성화하고 새 사용자 가입을 허용합니다.
이메일 확인을 켜고 OTP 길이를 **6자리**로 맞춥니다.
Email Templates의 **Magic Link** 및 신규 가입에 사용하는 **Confirm signup** 템플릿을 확인합니다.
메일 본문에 다음과 같이 `{{ .Token }}`을 넣고 로그인 링크(`{{ .ConfirmationURL }}`)는 제거합니다.

```html
<h2>BU 한인 중고거래 인증 코드</h2>
<p>앱으로 돌아가 아래 6자리 코드를 입력해 주세요.</p>
<p style="font-size: 28px; font-weight: bold;">{{ .Token }}</p>
```

앱은 `signInWithOtp`로 코드를 요청하고 `verifyOtp`의 `type: 'email'`로 확인합니다.
기본 재발송 대기 시간에 맞춰 화면에서도 60초 동안 재요청 버튼을 막습니다.
실제 발송 제한과 코드 유효기간은 Supabase 설정이 결정합니다.
([Supabase 이메일 OTP 문서](https://supabase.com/docs/guides/auth/auth-email-passwordless))

## 4. Resend SMTP 연결

Supabase의 기본 메일 서버는 프로젝트 팀에 등록된 주소로만 발송할 수 있어 일반 BU 학생 테스트에는 적합하지 않습니다.
담당자가 Resend의 발신 도메인을 인증한 뒤, Supabase Authentication의 Custom SMTP에
Resend SMTP 서버 정보와 인증 정보를 입력합니다. 발신 주소도 인증한 도메인으로 설정합니다.
SMTP 비밀 값은 Supabase 설정에만 저장합니다.
댓글 알림용 Edge Function은 기능 4에서 별도로 구현합니다.
([Supabase Custom SMTP 문서](https://supabase.com/docs/guides/auth/auth-smtp))

## 5. 실행과 실제 BU 계정 2개 테스트

Node.js와 npm이 설치된 컴퓨터에서 프로젝트 폴더를 열고 실행합니다.

```sh
npm ci
npm run lint
npm run build
npm run dev
```

계정 A는 일반 브라우저, 계정 B는 시크릿 창 또는 다른 브라우저에서 테스트합니다.

| 확인할 것 | 기대 결과 |
|---|---|
| 로그아웃 상태로 `/`, `/me`, `/listings/new` 직접 방문 | 로그인 화면으로 이동 |
| Gmail, `name@bu.edu.example.com`, `name@sub.bu.edu` 입력 | 코드 발송 없이 BU 이메일 안내 |
| 실제 계정 A로 코드 요청 | 로그인 링크가 아닌 6자리 코드 메일 수신 |
| 코드 화면 새로고침 / 60초 뒤 재발송 | 이메일과 대기 시간 유지, 새 코드로 인증 가능 |
| 잘못된 코드 / Supabase 설정 시간 이후의 만료 코드 입력 | 인증되지 않고 재시도 안내 |
| 계정 A 첫 로그인, 닉네임 입력 전에 홈 주소 직접 방문 | 닉네임 설정으로 다시 이동 |
| A 닉네임 저장 후 새로고침 / 브라우저 재시작 | 로그인과 닉네임 유지 |
| 계정 B에서 A와 같은 닉네임 저장 | 중복 안내, 다른 닉네임으로 저장 가능 |
| 계정 A의 두 탭을 열고 한 탭에서 로그아웃 | 두 탭 모두 로그인 화면으로 이동 |
| 다시 로그인한 A / 별도 브라우저의 B | 각자의 프로필 유지, A의 로컬 로그아웃이 B에 영향 없음 |

화면 검사와 별도로, 담당자가 **anon 키를 쓰는 실제 API 요청**으로 비로그인 데이터 읽기와
다른 사용자의 프로필 변경이 거부되는지 확인합니다. 화면의 이메일 검사를 우회한 비-BU 가입 요청도 거부되어야 합니다.
SQL Editor의 관리자 권한으로 실행한 요청은 RLS 테스트가 아닙니다.

이 문서를 추가할 때 실제 Supabase 프로젝트와 BU 계정 메일 테스트는 수행하지 않았습니다.
로컬 브라우저의 모의 API 테스트는 화면 흐름만 검증하며, 메일 발송·DB 트리거·실제 RLS 검증을 대신하지 않습니다.
두 BU 계정 테스트가 통과한 뒤 기능 2로 넘어갑니다.
