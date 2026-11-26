import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { supabase } from '../lib/supabase'
import { PROFILE_COLUMNS, type Profile } from '../lib/types'
import RatingSummary from './RatingSummary'

interface Props {
  /** 값이 바뀌면 프로필을 다시 불러온다. (거래를 확인해 완료 횟수가 바뀌었을 때) */
  refreshKey?: number
}

/** 기능 5·6 · 내 활동 맨 위의 내 프로필: 닉네임 · 평균 평점 · 거래 완료 횟수. */
export default function MyProfileCard({ refreshKey = 0 }: Props) {
  const { session, profile: loginProfile } = useAuth()
  const userId = session?.user.id
  // 로그인할 때 받은 프로필은 오래됐을 수 있어서(횟수·평점은 나중에 바뀐다) 최신 값을 다시 읽는다.
  const [fresh, setFresh] = useState<Profile | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
      if (active && !error && data) setFresh(data as Profile)
    })()
    return () => { active = false }
  }, [userId, refreshKey])

  const profile = fresh?.id === userId ? fresh : loginProfile
  if (!profile) return null

  const nickname = profile.nickname || '닉네임 없음'
  return (
    <section className="flex items-center gap-4 p-4 md:px-6">
      {/* 프로필 사진 대신 닉네임 첫 글자 */}
      <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-red-50 font-display text-2xl text-brand">
        {Array.from(nickname)[0]}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-2xl text-gray-900">{nickname}</h1>
        <p className="truncate text-xs text-gray-500">{session?.user.email}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingSummary ratingAvg={profile.rating_avg} ratingCount={profile.rating_count} />
          <span className="text-sm text-gray-700">거래 완료 <b className="font-semibold text-gray-900">{profile.completed_count}</b>회</span>
        </div>
      </div>
    </section>
  )
}
