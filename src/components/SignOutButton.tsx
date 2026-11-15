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
        className="min-h-11 px-2 text-sm text-gray-600 underline disabled:opacity-50">
        {busy ? '로그아웃 중…' : '로그아웃'}
      </button>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
