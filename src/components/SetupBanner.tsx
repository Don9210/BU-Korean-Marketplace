import { isSupabaseReady } from '../lib/supabase'

/** .env 가 비어 있을 때만 화면 맨 위에 뜨는 안내 띠. 값이 채워지면 자동으로 사라진다. */
export default function SetupBanner() {
  if (isSupabaseReady) return null

  return (
    <p className="bg-amber-100 px-4 py-2 text-xs text-amber-900">
      Supabase 연결 전입니다. <code>.env</code> 에 주소와 키를 넣으면 로그인·DB 가 동작합니다.
    </p>
  )
}
