import PagePlaceholder from '../components/PagePlaceholder'

// 화면 3 · 프로필 설정(닉네임) — 기능 1
export default function ProfileSetupPage() {
  return (
    <PagePlaceholder
      number={3}
      title="프로필 설정"
      file="src/pages/ProfileSetupPage.tsx"
      todos={[
        '닉네임 입력란 (첫 로그인 후 필수)',
        '이미 쓰는 닉네임이면 안내 문구 (nickname 은 중복 불가)',
        '"시작하기" 버튼 → profiles 에 닉네임 저장',
        '저장되면 홈으로 이동',
      ]}
      links={[{ to: '/', label: '홈(목록) 화면' }]}
    />
  )
}
