export const OTP_RESEND_SECONDS = 60
const PENDING_OTP_KEY = 'bu-market:pending-otp'

export interface PendingOtp {
  email: string
  resendAt: number
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isBuEmail(email: string) {
  return /^[^\s@]+@bu\.edu$/i.test(email)
}

export function nicknameError(nickname: string) {
  const length = Array.from(nickname.trim()).length
  return length < 2 || length > 20 ? '닉네임은 2~20자로 입력해 주세요.' : null
}

export function readPendingOtp(): PendingOtp | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_OTP_KEY) || 'null')
    return value && typeof value.email === 'string' && isBuEmail(value.email) &&
      typeof value.resendAt === 'number' && Number.isFinite(value.resendAt)
      ? value : null
  } catch {
    return null
  }
}

export function rememberOtp(email: string): PendingOtp {
  const pending = { email, resendAt: Date.now() + OTP_RESEND_SECONDS * 1000 }
  try {
    sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(pending))
  } catch {
    // 저장소를 막은 브라우저에서도 현재 화면의 코드 입력은 가능하다.
  }
  return pending
}

export function clearPendingOtp() {
  try {
    sessionStorage.removeItem(PENDING_OTP_KEY)
  } catch {
    // 브라우저 저장소 사용이 불가능해도 로그아웃은 계속한다.
  }
}

export function authErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const code = 'code' in error ? error.code : undefined
  const status = 'status' in error ? error.status : undefined
  if (status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return '요청이 많아요. 잠시 기다린 뒤 다시 시도해 주세요.'
  }
  if (code === 'otp_expired') {
    return '코드가 틀렸거나 만료되었어요. 다시 확인하거나 새 코드를 받아 주세요.'
  }
  if (code === '23505') return '이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.'
  return fallback
}
