import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import SignOutButton from './SignOutButton'
import Button from './Button'

/** DB의 RLS는 별도로 권한을 검사한다. 이 컴포넌트는 화면 이동을 맡는다. */
export default function AuthGuard({ mode }: { mode: 'guest' | 'profile' | 'member' }) {
  const { session, profile, loading, error, retry } = useAuth()

  if (loading) {
    return <p role="status" className="mx-auto max-w-md bg-white p-6 text-gray-600">로그인 상태를 확인하고 있어요…</p>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 bg-white p-6">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Button onClick={retry}>다시 시도</Button>
        {session && <SignOutButton />}
      </div>
    )
  }

  if (!session) return mode === 'guest' ? <Outlet /> : <Navigate to="/login" replace />
  if (!profile?.nickname?.trim()) return mode === 'profile' ? <Outlet /> : <Navigate to="/profile-setup" replace />
  return mode === 'member' ? <Outlet /> : <Navigate to="/" replace />
}
