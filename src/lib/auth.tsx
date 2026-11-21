import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from './auth-context'
import { clearPendingOtp, isBuEmail, nicknameError } from './auth-helpers'
import { isSupabaseReady, supabase } from './supabase'
import { PROFILE_COLUMNS, type Profile } from './types'

interface ProfileResult {
  userId: string
  data: Profile | null
  error: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseReady)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const currentUserId = useRef<string | undefined>(undefined)
  const userId = session?.user.id

  useEffect(() => {
    if (!isSupabaseReady) return
    let active = true
    let receivedEvent = false

    // 콜백 안에서는 상태만 바꾼다. DB 요청은 별도 effect에서 실행한다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      receivedEvent = true
      if (currentUserId.current !== nextSession?.user.id) setProfileResult(null)
      currentUserId.current = nextSession?.user.id
      setSession(nextSession)
      setSessionError(null)
      setReady(true)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedEvent) return
      if (error) throw error
      currentUserId.current = data.session?.user.id
      setSession(data.session)
      setReady(true)
    }).catch(() => {
      if (!active || receivedEvent) return
      setSessionError('로그인 상태를 확인하지 못했어요. 다시 시도해 주세요.')
      setReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [retryCount])

  useEffect(() => {
    let active = true
    if (!userId) return

    void (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single()
        if (error) throw error
        if (active) setProfileResult({ userId, data: data as Profile, error: null })
      } catch {
        if (active) setProfileResult({
          userId, data: null,
          error: '프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
        })
      }
    })()

    return () => { active = false }
  }, [userId, retryCount])

  const matchingProfile = profileResult?.userId === userId ? profileResult : null
  const invalidAccount = session && (!isBuEmail(session.user.email || '') || !session.user.email_confirmed_at)

  async function saveNickname(value: string) {
    if (!userId || invalidAccount) throw new Error('로그인이 필요해요.')
    const nickname = value.trim()
    const validationError = nicknameError(nickname)
    if (validationError) throw new Error(validationError)
    const { data, error } = await supabase.from('profiles')
      .update({ nickname }).eq('id', userId).select(PROFILE_COLUMNS).single()
    if (error) throw error
    if (currentUserId.current === userId) {
      setProfileResult({ userId, data: data as Profile, error: null })
    }
  }

  async function signOut() {
    // 이 브라우저만 로그아웃한다. 다른 기기의 로그인은 유지한다.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    clearPendingOtp()
    currentUserId.current = undefined
    setSession(null)
    setProfileResult(null)
  }

  function retry() {
    setReady(!isSupabaseReady)
    setSessionError(null)
    setProfileResult(null)
    setRetryCount((count) => count + 1)
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile: matchingProfile?.data ?? null,
      loading: !ready || Boolean(session && !matchingProfile && !invalidAccount),
      error: invalidAccount ? '인증된 bu.edu 계정으로 로그인해 주세요.' : sessionError || matchingProfile?.error || null,
      retry, saveNickname, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

