import PagePlaceholder from '../components/PagePlaceholder'

// 화면 2 · 코드 입력 — 기능 1
export default function VerifyCodePage() {
  return (
    <PagePlaceholder
      number={2}
      title="인증 코드 입력"
      file="src/pages/VerifyCodePage.tsx"
      todos={[
        '메일로 받은 6자리 코드 입력란',
        '"확인" 버튼 → supabase.auth.verifyOtp',
        '코드가 틀리면 안내 문구, "코드 다시 받기" 버튼',
        '닉네임이 없으면 프로필 설정으로, 있으면 홈으로 이동',
      ]}
      links={[
        { to: '/profile-setup', label: '프로필 설정 화면' },
        { to: '/login', label: '로그인 화면으로 돌아가기' },
      ]}
    />
  )
}
