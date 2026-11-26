import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconHome, IconPlusCircle, IconUser } from './icons'
import SetupBanner from './SetupBanner'
import SignOutButton from './SignOutButton'

// 화면 아래 메뉴 3개
const TABS = [
  { to: '/', label: '홈', end: true, Icon: IconHome },
  { to: '/listings/new', label: '글쓰기', end: false, Icon: IconPlusCircle },
  { to: '/me', label: '내 활동', end: false, Icon: IconUser },
]

/**
 * 로그인 후 화면의 틀: 위 제목 줄 + 가운데 내용 + 메뉴.
 * 폰에서는 폰 너비 + 아래 메뉴, 넓은 화면(PC·태블릿, 768px 이상 = md:)에서는 넓은 너비 + 위 메뉴.
 */
export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white md:max-w-5xl">
      <SetupBanner />
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur md:px-6">
        {/* 로고: 주아체 */}
        <Link to="/" className="shrink-0 py-2 font-display text-[22px] leading-none text-brand">BU 한인 중고거래</Link>
        {/* 넓은 화면용 위 메뉴 */}
        <nav aria-label="메뉴" className="mr-auto ml-8 hidden gap-1 md:flex">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${
                  isActive ? 'bg-red-50 text-brand' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link
            to="/profile/edit"
            className="flex min-h-10 items-center rounded-full px-3 text-[13px] font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            프로필 수정
          </Link>
          <SignOutButton />
        </div>
      </header>

      {/* 각 화면(pages/)이 이 자리에 들어온다 */}
      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* 폰용 아래 메뉴: 아이콘 + 글자 */}
      <nav aria-label="메뉴" className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${
                isActive ? 'text-brand' : 'text-gray-400'
              }`
            }
          >
            <tab.Icon className="h-6 w-6" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
