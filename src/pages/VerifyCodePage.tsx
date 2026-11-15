import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Button from '../components/Button'
import { authErrorMessage, clearPendingOtp, isBuEmail, readPendingOtp, rememberOtp, type PendingOtp } from '../lib/auth-helpers'
import { isSupabaseReady, supabase } from '../lib/supabase'

export default function VerifyCodePage() {
  const location = useLocation()
  const [pending, setPending] = useState<PendingOtp | null>(() => {
    const saved = readPendingOtp()
    if (saved) return saved
    const state = location.state as Partial<PendingOtp> | null
    return state && typeof state.email === 'string' && isBuEmail(state.email) &&
      typeof state.resendAt === 'number' && Number.isFinite(state.resendAt) ? state as PendingOtp : null
  })
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('인증 코드를 보냈어요. 받은편지함과 스팸함을 확인해 주세요.')
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null)
  const [now, setNow] = useState(Date.now)
  const secondsLeft = Math.max(0, Math.ceil(((pending?.resendAt ?? 0) - now) / 1000))

  useEffect(() => {
    if (!secondsLeft) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !pending || !isSupabaseReady) return
    if (!/^\d{6}$/.test(code)) {
      setError('6자리 숫자 코드를 입력해 주세요.')
      return
    }
    setBusy('verify')
    setError('')
    try {
      const { data, error: requestError } = await supabase.auth.verifyOtp({ email: pending.email, token: code, type: 'email' })
      if (requestError) throw requestError
      if (!data.session) throw new Error('로그인 세션이 없습니다.')
      clearPendingOtp()
      // AuthGuard가 프로필을 확인하고 닉네임 설정 또는 홈으로 이동한다.
    } catch (requestError) {
      setError(authErrorMessage(requestError, '코드를 확인하지 못했어요. 입력한 코드와 인터넷 연결을 확인해 주세요.'))
    } finally {
      setBusy(null)
    }
  }

  async function handleResend() {
    if (busy || secondsLeft || !pending || !isSupabaseReady) return
    setBusy('resend')
    setError('')
    setNotice('')
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({ email: pending.email })
      if (requestError) throw requestError
      setPending(rememberOtp(pending.email))
      setNow(Date.now())
      setCode('')
      setNotice('새 코드를 보냈어요. 가장 최근에 받은 코드를 입력해 주세요.')
    } catch (requestError) {
      setError(authErrorMessage(requestError, '코드를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'))
    } finally {
      setBusy(null)
    }
  }

  if (!pending || !isSupabaseReady) return <Navigate to="/login" replace />

  return (
    <section className="px-4 py-8">
      <h1 className="text-xl font-bold">인증 코드 입력</h1>
      <p className="mt-2 break-all text-sm text-gray-600">{pending.email}</p>
      <p role="status" className="mt-2 text-sm leading-6 text-gray-600">{notice}</p>
      <form onSubmit={handleVerify} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="code" className="mb-2 block text-sm font-semibold">6자리 인증 코드</label>
          <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
            value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            maxLength={6} required disabled={Boolean(busy)} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'code-error' : undefined} placeholder="000000"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.4em] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        {error && <p id="code-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={Boolean(busy)}>{busy === 'verify' ? '확인 중…' : '확인'}</Button>
        <Button type="button" variant="secondary" onClick={handleResend} disabled={Boolean(busy) || secondsLeft > 0}>
          {busy === 'resend' ? '코드 보내는 중…' : secondsLeft > 0 ? `코드 다시 받기 (${secondsLeft}초)` : '코드 다시 받기'}
        </Button>
      </form>
      {!busy && <Link to="/login" replace className="mt-4 inline-block py-3 text-sm text-gray-600 underline">이메일 주소 변경</Link>}
    </section>
  )
}
