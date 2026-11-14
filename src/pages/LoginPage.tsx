import PagePlaceholder from '../components/PagePlaceholder'

// 화면 1 · 로그인(이메일 입력) — 기능 1
export default function LoginPage() {
  return (
    <PagePlaceholder
      number={1}
      title="로그인"
      file="src/pages/LoginPage.tsx"
      todos={[
        'bu.edu 이메일 입력란',
        '@bu.edu 가 아니면 안내 문구 표시 (화면 검사)',
        '"인증 코드 받기" 버튼 → supabase.auth.signInWithOtp',
        '성공하면 코드 입력 화면으로 이동',
      ]}
      links={[{ to: '/verify', label: '코드 입력 화면' }]}
    />
  )
}
