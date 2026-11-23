import { Link, NavLink, Outlet } from 'react-router-dom'
import SetupBanner from './SetupBanner'
import SignOutButton from './SignOutButton'

// 화면 아래 메뉴 3개
const TABS = [
  { to: '/', label: '홈', end: true },
  { to: '/listings/new', label: '글쓰기', end: false },
  { to: '/me', label: '내 활동', end: false },
]

/**
 * 로그인 후 화면의 틀: 위 제목 줄 + 가운데 내용 + 메뉴.
 * 폰에서는 폰 너비 + 아래 메뉴, 넓은 화면(PC·태블릿, 768px 이상 = md:)에서는 넓은 너비 + 위 메뉴.
 */
export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white md:max-w-5xl">
      <SetupBanner />
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <Link to="/" className="shrink-0 py-2 text-lg font-extrabold text-brand">BU 한인 중고거래</Link>
        {/* 넓은 화면용 위 메뉴 */}
        <nav aria-label="메뉴" className="mr-auto ml-8 hidden gap-1 md:flex">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-semibold ${
                  isActive ? 'bg-red-50 text-brand' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center">
          <Link to="/profile/edit" className="flex min-h-11 items-center px-2 text-sm text-gray-600 underline">프로필 수정</Link>
          <SignOutButton />
        </div>
      </header>

      {/* 각 화면(pages/)이 이 자리에 들어온다 */}
      <main className="flex-1 pb-16 md:pb-8">
        <Outlet />
      </main>

      {/* 폰용 아래 메뉴 */}
      <nav aria-label="메뉴" className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
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
