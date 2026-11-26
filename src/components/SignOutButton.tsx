import { useState } from 'react'
import { useAuth } from '../lib/auth-context'

export default function SignOutButton() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await signOut()
    } catch {
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={handleSignOut} disabled={busy}
        className="flex min-h-10 items-center rounded-full px-3 text-[13px] font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50">
        {busy ? '로그아웃 중…' : '로그아웃'}
      </button>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
