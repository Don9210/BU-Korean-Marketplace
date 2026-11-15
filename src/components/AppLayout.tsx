import { NavLink, Outlet } from 'react-router-dom'
import SetupBanner from './SetupBanner'
import SignOutButton from './SignOutButton'

// 화면 아래 메뉴 3개
const TABS = [
  { to: '/', label: '홈', end: true },
  { to: '/listings/new', label: '글쓰기', end: false },
  { to: '/me', label: '내 활동', end: false },
]

/** 로그인 후 화면의 틀: 위 제목 줄 + 가운데 내용 + 아래 메뉴. 폰 너비로 고정한다. */
export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <SetupBanner />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-lg font-extrabold text-brand">BU 한인 중고거래</p>
        <SignOutButton />
      </header>

      {/* 각 화면(pages/)이 이 자리에 들어온다 */}
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-semibold ${
                isActive ? 'text-brand' : 'text-gray-500'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
