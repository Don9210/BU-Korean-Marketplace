import { Outlet } from 'react-router-dom'
import SetupBanner from './SetupBanner'

// 넓은 화면의 소개 칸에 보여 주는 앱의 특징 3가지
const POINTS = [
  { title: 'BU 학생끼리만', text: 'bu.edu 이메일 인증을 거친 학생만 가입할 수 있어요.' },
  { title: '비밀댓글로 약속', text: '댓글은 판매자와 나만 볼 수 있어요. 시간과 장소도 여기서 정해요.' },
  { title: '거래 후 서로 평가', text: '거래 완료 횟수와 평점으로 믿을 수 있는 상대를 알아봐요.' },
]

/**
 * 로그인 전 화면(로그인 · 코드 입력 · 프로필 설정)의 틀. 메뉴가 없다.
 * 폰에서는 위에 제목, 아래에 입력 칸. 넓은 화면(md: 이상)에서는 왼쪽에 소개, 오른쪽에 입력 칸.
 */
export default function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white md:max-w-none md:flex-row">
      {/* 넓은 화면에서만 보이는 소개 칸 */}
      <aside className="hidden bg-brand px-12 py-16 text-white md:flex md:w-1/2 md:flex-col md:justify-center lg:px-20">
        <p className="font-display text-5xl lg:text-6xl">BU 한인 중고거래</p>
        <p className="mt-4 text-lg text-white/90">보스턴대 한인 학생들의 캠퍼스 중고장터</p>
        <ul className="mt-12 space-y-6">
          {POINTS.map((point) => (
            <li key={point.title} className="border-l-2 border-white/40 pl-4">
              <p className="text-lg font-bold">{point.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/85">{point.text}</p>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-1 flex-col md:justify-center md:py-10">
        <div className="md:mx-auto md:w-full md:max-w-md">
          <SetupBanner />
          {/* 폰에서는 제목을 여기에 보여 준다. 넓은 화면에서는 왼쪽 소개 칸에 있으므로 숨긴다. */}
          <header className="px-4 pt-10 pb-2 md:hidden">
            <p className="font-display text-3xl text-brand">BU 한인 중고거래</p>
            <p className="mt-1 text-sm text-gray-500">bu.edu 인증 학생끼리만 거래해요</p>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
