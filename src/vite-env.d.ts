/// <reference types="vite/client" />

// .env 에 넣는 값의 이름과 종류. 새 값을 추가하면 여기에도 적는다.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** 시연용 체험 계정의 비밀번호. 없으면 체험 계정 버튼이 보이지 않는다. */
  readonly VITE_DEMO_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
