import type { SVGProps } from 'react'

// 앱에서 쓰는 작은 선 아이콘 모음. 글자 색(currentColor)을 따라가고, 크기는 className 으로 정한다.
// 새 패키지 없이 쓰려고 직접 그린 단순한 모양이다.

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, className = 'h-6 w-6', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

/** 홈 */
export function IconHome(props: IconProps) {
  return <Base {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></Base>
}

/** 글쓰기 (동그라미 + 더하기) */
export function IconPlusCircle(props: IconProps) {
  return <Base {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Base>
}

/** 사람 (내 활동) */
export function IconUser(props: IconProps) {
  return <Base {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Base>
}

/** 확인 (확인 대기 거래) */
export function IconCheckCircle(props: IconProps) {
  return <Base {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></Base>
}

/** 별 (평가할 거래) */
export function IconStar(props: IconProps) {
  return <Base {...props}><path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" /></Base>
}

/** 가격표 (내 판매 글) */
export function IconTag(props: IconProps) {
  return <Base {...props}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></Base>
}

/** 말풍선 (내가 댓글 단 글) */
export function IconChat(props: IconProps) {
  return <Base {...props}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" /></Base>
}
