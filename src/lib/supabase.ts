import { createClient } from '@supabase/supabase-js'

// Supabase 연결(클라이언트). 앱 전체에서 이 파일의 supabase 하나만 가져다 쓴다.
// 주소와 키는 .env 파일에서 읽는다. (.env 는 GitHub 에 올라가지 않는다)
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** .env 에 두 값이 모두 채워져 있으면 true */
export const isSupabaseReady = Boolean(url && anonKey)

if (!isSupabaseReady) {
  console.warn(
    '[bu-market] .env 에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 가 없습니다. 화면은 뜨지만 로그인·DB 는 동작하지 않습니다.',
  )
}

// 값이 없어도 화면이 깨지지 않도록 임시 주소를 넣는다. 이때 실제 요청은 실패한다.
export const supabase = createClient(
  url || 'https://not-configured.supabase.co',
  anonKey || 'not-configured',
)
