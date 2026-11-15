import { useState, type FormEvent } from 'react'
import Button from '../components/Button'
import SignOutButton from '../components/SignOutButton'
import { useAuth } from '../lib/auth-context'
import { authErrorMessage, nicknameError } from '../lib/auth-helpers'

export default function ProfileSetupPage() {
  const { saveNickname } = useAuth()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const validationError = nicknameError(nickname)
    if (validationError) { setError(validationError); return }
    setBusy(true)
    setError('')
    try {
      await saveNickname(nickname)
      // 저장된 프로필을 AuthGuard가 확인하고 홈으로 이동한다.
    } catch (requestError) {
      setError(authErrorMessage(requestError, '닉네임을 저장하지 못했어요. 다시 시도해 주세요.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="px-4 py-8">
      <h1 className="text-xl font-bold">어떤 이름으로 만날까요?</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">이메일 인증이 완료됐어요. 거래할 때 사용할 닉네임을 정해 주세요.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="nickname" className="mb-2 block text-sm font-semibold">닉네임</label>
          <input id="nickname" name="nickname" type="text" autoComplete="nickname" value={nickname}
            onChange={(event) => { setNickname(event.target.value); setError('') }} required disabled={busy}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'nickname-help nickname-error' : 'nickname-help'}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <p id="nickname-help" className="mt-2 text-xs text-gray-500">2~20자, 다른 사람과 겹치지 않는 이름을 입력해 주세요.</p>
        </div>
        {error && <p id="nickname-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? '저장 중…' : '시작하기'}</Button>
      </form>
      {!busy && <div className="mt-4"><SignOutButton /></div>}
    </section>
  )
}
