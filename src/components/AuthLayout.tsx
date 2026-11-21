import { Outlet } from 'react-router-dom'
import SetupBanner from './SetupBanner'

/** 로그인 전 화면(로그인 · 코드 입력 · 프로필 설정)의 틀. 메뉴가 없다. 넓은 화면에서는 가운데 카드로 보인다. */
export default function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white md:my-12 md:min-h-0 md:rounded-2xl md:pb-6 md:shadow-sm">
      <SetupBanner />
      <header className="px-4 pt-10 pb-2">
        <p className="text-2xl font-extrabold text-brand">BU 한인 중고거래</p>
        <p className="mt-1 text-sm text-gray-500">bu.edu 인증 학생끼리만 거래해요</p>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
