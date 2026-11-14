import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = 빨간 주 버튼, secondary = 테두리만 있는 보조 버튼 */
  variant?: 'primary' | 'secondary'
}

/** 앱 전체에서 쓰는 공용 버튼. 손가락으로 누르기 쉽게 높이를 넉넉히 준다. */
export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors disabled:opacity-50'
  const style =
    variant === 'primary'
      ? 'bg-brand text-white active:bg-brand-dark'
      : 'border border-gray-300 bg-white text-gray-800 active:bg-gray-100'

  return <button className={`${base} ${style} ${className}`} {...rest} />
}
