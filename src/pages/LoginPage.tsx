import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { authErrorMessage, isBuEmail, normalizeEmail, readPendingOtp, rememberOtp } from '../lib/auth-helpers'
import { isSupabaseReady, supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => readPendingOtp()?.email ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !isSupabaseReady) return
    const normalized = normalizeEmail(email)
    if (!isBuEmail(normalized)) {
      setError('@bu.edu 이메일을 입력해 주세요.')
      return
    }
    const pending = readPendingOtp()
    if (pending?.email === normalized && pending.resendAt > Date.now()) {
      navigate('/verify', { state: pending })
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({ email: normalized })
      if (requestError) throw requestError
      navigate('/verify', { state: rememberOtp(normalized) })
    } catch (requestError) {
      setError(authErrorMessage(requestError, '코드를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="px-4 py-8">
      <h1 className="text-xl font-bold">BU 이메일로 시작하기</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">학교 이메일로 인증 코드를 보내드려요. 비밀번호는 필요 없어요.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold">BU 이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none"
            spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setError('') }}
            placeholder="yourname@bu.edu" required disabled={busy} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'email-help email-error' : 'email-help'}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <p id="email-help" className="mt-2 text-xs text-gray-500">@bu.edu 이메일만 사용할 수 있어요.</p>
        </div>
        {error && <p id="email-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy || !isSupabaseReady}>{busy ? '코드 보내는 중…' : '인증 코드 받기'}</Button>
      </form>
    </section>
  )
}
