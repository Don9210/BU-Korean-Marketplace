import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Button from './Button'

// 시연용 체험 계정. 로그인 메일을 보낼 수 없는 동안(도메인 연결 전) 누구나 앱을 둘러볼 수 있게 한다.
// - 계정은 Supabase 대시보드에서 직접 만든다. 방법: docs/demo-accounts.md
// - 비밀번호는 코드에 쓰지 않고 .env 의 VITE_DEMO_PASSWORD 에서 읽는다. 값이 없으면 이 칸은 보이지 않는다.
// - 실제로 학생들에게 공개하기 전에 반드시 끈다. (VITE_DEMO_PASSWORD 삭제 + 체험 계정 삭제)

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? ''

/** 실제 BU 주소와 겹치지 않도록 긴 이름을 쓴다. 대시보드에서 만드는 계정의 이메일과 같아야 한다. */
const DEMO_ACCOUNTS = [
  { label: '체험 계정 1', email: 'bumarket-demo-1@bu.edu' },
  { label: '체험 계정 2', email: 'bumarket-demo-2@bu.edu' },
  { label: '체험 계정 3', email: 'bumarket-demo-3@bu.edu' },
]

/** 로그인 화면 아래의 "체험 계정으로 둘러보기". 누르면 메일 인증 없이 그 계정으로 들어간다. */
export default function DemoLogin() {
  const [busyEmail, setBusyEmail] = useState('')
  const [error, setError] = useState('')

  if (!DEMO_PASSWORD) return null

  async function handleEnter(email: string) {
    if (busyEmail) return
    setBusyEmail(email)
    setError('')
    // 성공하면 로그인 상태가 바뀌면서 화면이 자동으로 넘어간다. (AuthGuard)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD })
    if (signInError) {
      setError('체험 계정으로 들어가지 못했어요. 잠시 뒤 다시 시도해 주세요.')
      setBusyEmail('')
    }
  }

  return (
    <section aria-labelledby="demo-title" className="mx-4 mb-8 rounded-xl border border-dashed border-gray-300 p-4">
      <h2 id="demo-title" className="text-sm font-bold text-gray-900">
        <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">시연용</span>
        체험 계정으로 둘러보기
      </h2>
      <p className="mt-2 text-xs leading-5 text-gray-600">
        메일 인증 없이 바로 들어가요. 계정을 바꿔 가며 판매자와 구매자 역할을 모두 해 볼 수 있어요.
        누구나 쓰는 계정이라 올린 글과 댓글은 다른 사람에게도 보여요.
      </p>
      <div className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="secondary"
            disabled={Boolean(busyEmail)}
            onClick={() => handleEnter(account.email)}
          >
            {busyEmail === account.email ? '들어가는 중…' : `${account.label} 들어가기`}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
