/// <reference types="vite/client" />

// .env 에 넣는 값의 이름과 종류. 새 값을 추가하면 여기에도 적는다.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
